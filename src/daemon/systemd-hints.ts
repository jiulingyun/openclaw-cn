import { formatCliCommand } from "../cli/command-format.js";

export function isSystemdUnavailableDetail(detail?: string): boolean {
  if (!detail) return false;
  const normalized = detail.toLowerCase();
  return (
    normalized.includes("systemctl --user unavailable") ||
    normalized.includes("systemctl not available") ||
    normalized.includes("not been booted with systemd") ||
    normalized.includes("failed to connect to bus") ||
    normalized.includes("systemd user services are required")
  );
}

/**
 * 检测Ubuntu/Debian特定问题
 */
export function detectUbuntuIssue(detail?: string, env: Record<string, string | undefined> = process.env): {
  isUbuntu: boolean;
  confidence: 'low' | 'medium' | 'high';
  source?: string;
  issue?: string;
  fix?: string;
  isWSL?: boolean;
} {
  if (!detail) {
    // 检查环境变量
    if (env.OS && env.OS.toLowerCase().includes('ubuntu')) {
      return { isUbuntu: true, confidence: 'high', source: 'env.OS' };
    }
    if (env.DISTRIB_ID && env.DISTRIB_ID.toLowerCase().includes('ubuntu')) {
      return { isUbuntu: true, confidence: 'high', source: 'env.DISTRIB_ID' };
    }
    return { isUbuntu: false, confidence: 'low' };
  }
  
  const normalized = detail.toLowerCase();
  
  // 直接包含Ubuntu/Debian字样
  if (normalized.includes('ubuntu') || normalized.includes('debian')) {
    return { isUbuntu: true, confidence: 'high', source: 'error message' };
  }
  
  // 检查常见的Ubuntu/Debian特定错误模式
  const ubuntuLikePatterns = [
    // DBus连接错误在Ubuntu上很常见
    /failed to connect to bus.*no such file or directory/i,
    /dbus.*connection/i,
    // systemd用户服务配置问题
    /systemctl --user.*unavailable/i,
    /user.*service.*not.*found/i,
    // 特定的文件路径模式
    /\/home\/[^\/]+\/\.config\/systemd\/user/i,
    /\/run\/user\/\d+\/bus/i
  ];
  
  for (const pattern of ubuntuLikePatterns) {
    if (pattern.test(detail)) {
      return { 
        isUbuntu: true, 
        confidence: 'medium', 
        source: 'error pattern',
        pattern: pattern.toString()
      };
    }
  }
  
  // 检查环境变量（备用方法）
  const envVars = ['OS', 'DISTRIB_ID', 'DISTRIB_CODENAME', 'DISTRIB_DESCRIPTION'];
  for (const envVar of envVars) {
    if (env[envVar] && env[envVar].toLowerCase().includes('ubuntu')) {
      return { 
        isUbuntu: true, 
        confidence: 'high', 
        source: `env.${envVar}`,
        value: env[envVar]
      };
    }
    if (env[envVar] && env[envVar].toLowerCase().includes('debian')) {
      return { 
        isUbuntu: true, 
        confidence: 'high', 
        source: `env.${envVar}`,
        value: env[envVar]
      };
    }
  }
  
  return { isUbuntu: false, confidence: 'low' };
}

export function renderSystemdUnavailableHints(options: { 
  wsl?: boolean;
  ubuntu?: boolean;
  issue?: string;
  fix?: string;
} = {}): string[] {
  if (options.wsl) {
    return [
      "WSL2 需要启用 systemd：编辑 /etc/wsl.conf 添加 [boot] 和 systemd=true",
      "然后在 PowerShell 中运行: wsl --shutdown，再重新打开 WSL",
      "验证命令: systemctl --user status",
    ];
  }
  
  if (options.ubuntu) {
    const hints = [
      "Ubuntu/Debian systemd 用户服务配置指南:",
      "",
      "1. 启用用户 linger (允许用户服务在注销后继续运行):",
      "   sudo loginctl enable-linger $USER",
      "",
      "2. 确保用户目录存在:",
      "   mkdir -p ~/.config/systemd/user",
      "",
      "3. 重新加载用户服务:",
      "   systemctl --user daemon-reexec",
      "",
      "4. 验证状态:",
      "   systemctl --user status",
      "",
      "5. 如果使用WSL2，还需要:",
      "   - 编辑 /etc/wsl.conf 添加:",
      "     [boot]",
      "     systemd=true",
      "   - 重启WSL: wsl --shutdown",
      "",
      "如果仍无法使用systemd，替代方案:",
      "- 使用前台模式: openclaw-cn gateway run",
      "- 使用其他进程管理器:",
      "  • pm2: pm2 start ~/.config/openclaw/run.sh --name openclaw",
      "  • supervisor: 配置/etc/supervisor/conf.d/openclaw.conf",
      "  • 手动systemd: 创建~/.config/systemd/user/openclaw.service",
    ];
    
    if (options.issue) {
      hints.unshift(`检测到问题: ${options.issue}`);
      if (options.fix) {
        hints.unshift(`修复建议: ${options.fix}`);
      }
    }
    
    return hints;
  }
  
  return [
    "systemd 用户服务不可用；请安装/启用 systemd，或使用其他进程管理器运行网关。",
    `如果在容器中运行，请使用前台模式: ${formatCliCommand("openclaw-cn gateway run")}`,
  ];
}

/**
 * 获取详细的systemd错误提示
 */
export function getDetailedSystemdHints(detail?: string): string[] {
  const ubuntuInfo = detectUbuntuIssue(detail);
  
  if (ubuntuInfo.isUbuntu) {
    return renderSystemdUnavailableHints({ 
      ubuntu: true, 
      issue: ubuntuInfo.issue,
      fix: ubuntuInfo.fix,
      wsl: ubuntuInfo.isWSL
    });
  }
  
  // 检查是否为WSL
  const normalized = detail?.toLowerCase() || '';
  if (normalized.includes("wsl") || normalized.includes("windows subsystem")) {
    return renderSystemdUnavailableHints({ wsl: true });
  }
  
  return renderSystemdUnavailableHints();
}
