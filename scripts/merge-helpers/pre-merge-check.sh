#!/bin/bash
# 预检查合并准备工作
# Usage: ./pre-merge-check.sh

set -e

echo "=== 上游合并预检查 ==="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# 检查函数
check_pass() {
  echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
  echo -e "${RED}✗${NC} $1"
  ((ERRORS++))
}

check_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((WARNINGS++))
}

# 1. 检查 git 仓库状态
echo "1. 检查 Git 仓库状态..."
if git rev-parse --git-dir > /dev/null 2>&1; then
  check_pass "在 Git 仓库中"
else
  check_fail "不在 Git 仓库中"
  exit 1
fi

# 2. 检查工作区是否干净
if [ -z "$(git status --porcelain)" ]; then
  check_pass "工作区干净"
else
  check_warn "工作区有未提交的更改"
  echo "  建议: git stash 或 git commit"
fi

# 3. 检查是否在正确的分支
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "main" ]; then
  check_warn "当前在 main 分支"
  echo "  建议: 创建合并分支: git checkout -b merge-upstream-\$(date +%Y%m%d)"
else
  check_pass "当前分支: $CURRENT_BRANCH"
fi

# 4. 检查 upstream 远程
echo ""
echo "2. 检查远程仓库..."
if git remote | grep -q "^upstream$"; then
  UPSTREAM_URL=$(git remote get-url upstream)
  if [[ $UPSTREAM_URL =~ openclaw/openclaw ]]; then
    check_pass "upstream 远程已配置: $UPSTREAM_URL"
  else
    check_fail "upstream 指向错误的仓库: $UPSTREAM_URL"
    echo "  应该指向: https://github.com/openclaw/openclaw"
  fi
else
  check_fail "未配置 upstream 远程"
  echo "  运行: git remote add upstream https://github.com/openclaw/openclaw"
fi

# 5. 检查是否已 fetch upstream
echo ""
echo "3. 检查上游更新..."
if git rev-parse upstream/main > /dev/null 2>&1; then
  COMMITS_BEHIND=$(git rev-list --count HEAD..upstream/main 2>/dev/null || echo "unknown")
  if [ "$COMMITS_BEHIND" != "unknown" ]; then
    check_pass "已获取上游更新"
    echo "  上游领先: $COMMITS_BEHIND 个提交"
  else
    check_warn "无法计算差距"
  fi
else
  check_warn "未获取上游更新"
  echo "  建议: git fetch upstream"
fi

# 6. 检查必要工具
echo ""
echo "4. 检查必要工具..."
for tool in jq git node pnpm; do
  if command -v $tool &> /dev/null; then
    VERSION=$($tool --version 2>/dev/null | head -1 || echo "unknown")
    check_pass "$tool 已安装 ($VERSION)"
  else
    if [ "$tool" = "pnpm" ]; then
      check_warn "$tool 未安装（可选）"
    else
      check_fail "$tool 未安装"
    fi
  fi
done

# 7. 检查 Node 版本
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version | sed 's/v//')
  NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge 22 ]; then
    check_pass "Node.js 版本满足要求 (v$NODE_VERSION >= 22)"
  else
    check_warn "Node.js 版本较低 (v$NODE_VERSION < 22)"
    echo "  建议: 升级到 Node.js 22 或更高版本"
  fi
fi

# 8. 检查磁盘空间
echo ""
echo "5. 检查系统资源..."
DISK_AVAILABLE=$(df -h . | awk 'NR==2 {print $4}')
check_pass "可用磁盘空间: $DISK_AVAILABLE"

# 9. 检查备份
echo ""
echo "6. 检查备份..."
if git branch | grep -q "backup-before-merge"; then
  check_pass "存在备份分支: backup-before-merge"
else
  check_warn "未找到备份分支"
  echo "  建议: git branch backup-before-merge"
fi

# 10. 检查关键文件
echo ""
echo "7. 检查关键文件..."
CRITICAL_FILES=("package.json" "README.md" "CHANGELOG.md")
for file in "${CRITICAL_FILES[@]}"; do
  if [ -f "$file" ]; then
    check_pass "$file 存在"
  else
    check_fail "$file 不存在"
  fi
done

# 总结
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "=== 检查总结 ==="
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}✗ 发现 $ERRORS 个错误${NC}"
  echo "请先解决错误后再进行合并"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠ 发现 $WARNINGS 个警告${NC}"
  echo "建议处理警告后再进行合并"
  echo ""
  read -p "是否继续? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 1
  fi
else
  echo -e "${GREEN}✓ 所有检查通过！${NC}"
fi

echo ""
echo "=== 推荐的合并步骤 ==="
echo "1. 创建备份分支:"
echo "   git branch backup-before-merge"
echo ""
echo "2. 创建合并分支:"
echo "   git checkout -b merge-upstream-\$(date +%Y%m%d)"
echo ""
echo "3. 执行合并:"
echo "   git merge upstream/main --no-ff -m 'merge: sync with upstream'"
echo ""
echo "4. 解决冲突:"
echo "   ./scripts/merge-helpers/classify-conflicts.sh"
echo ""
echo "5. 测试:"
echo "   pnpm install && pnpm build && pnpm test"
echo ""
echo "更多详细信息，请参考: MERGE_UPSTREAM_STRATEGY.md"
