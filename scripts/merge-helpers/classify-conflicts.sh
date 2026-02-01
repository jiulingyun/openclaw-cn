#!/bin/bash
# 分类冲突文件，帮助批量处理
# Usage: ./classify-conflicts.sh

set -e

echo "=== 正在分析冲突文件 ==="

# 列出所有冲突文件
CONFLICTS=$(git diff --name-only --diff-filter=U 2>/dev/null || echo "")

if [ -z "$CONFLICTS" ]; then
  echo "✓ 没有发现冲突文件"
  exit 0
fi

# 分类数组
KEEP_OURS=()
KEEP_THEIRS=()
NEED_MANUAL=()

# 读取文件到数组
while IFS= read -r file; do
  case "$file" in
    # 完全保留本地版本
    README.md|FEISHU_NPM_READY.md)
      KEEP_OURS+=("$file")
      ;;
    
    # 本地化文档
    docs/CNAME|docs/_config.yml|docs/_layouts/*|docs/assets/*)
      KEEP_OURS+=("$file")
      ;;
    
    # 自定义工作流
    .github/workflows/npm-publish.yml|.github/workflows/docker-build-multiarch.yml)
      KEEP_OURS+=("$file")
      ;;
    
    # 需要手动合并的关键文件
    package.json|.env.example|.dockerignore)
      NEED_MANUAL+=("$file")
      ;;
    
    # GitHub 配置可能需要合并
    .github/*)
      NEED_MANUAL+=("$file")
      ;;
    
    # 核心功能代码 - 采用上游
    src/infra/*|src/media/*|src/providers/*)
      KEEP_THEIRS+=("$file")
      ;;
    
    # 测试文件 - 采用上游
    src/**/*.test.ts|test/*)
      KEEP_THEIRS+=("$file")
      ;;
    
    # CLI 和用户界面可能需要手动处理（中文化）
    src/cli/*|src/gateway/*|src/commands/*)
      NEED_MANUAL+=("$file")
      ;;
    
    # 默认需要手动检查
    *)
      NEED_MANUAL+=("$file")
      ;;
  esac
done <<< "$CONFLICTS"

# 显示分类结果
echo ""
echo "=== 建议保留本地版本 (${#KEEP_OURS[@]} 个文件) ==="
if [ ${#KEEP_OURS[@]} -gt 0 ]; then
  printf '  📌 %s\n' "${KEEP_OURS[@]}"
else
  echo "  (无)"
fi

echo ""
echo "=== 建议采用上游版本 (${#KEEP_THEIRS[@]} 个文件) ==="
if [ ${#KEEP_THEIRS[@]} -gt 0 ]; then
  printf '  ⬆️  %s\n' "${KEEP_THEIRS[@]}"
else
  echo "  (无)"
fi

echo ""
echo "=== 需要手动处理 (${#NEED_MANUAL[@]} 个文件) ==="
if [ ${#NEED_MANUAL[@]} -gt 0 ]; then
  printf '  ✋ %s\n' "${NEED_MANUAL[@]}"
else
  echo "  (无)"
fi

# 询问是否自动处理
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "是否自动解决建议的文件? (y/N) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  SUCCESS_COUNT=0
  
  # 保留本地版本
  for file in "${KEEP_OURS[@]}"; do
    if git checkout --ours "$file" 2>/dev/null; then
      git add "$file"
      echo "  ✓ 保留本地: $file"
      ((SUCCESS_COUNT++))
    else
      echo "  ✗ 失败: $file"
    fi
  done
  
  # 采用上游版本
  for file in "${KEEP_THEIRS[@]}"; do
    if git checkout --theirs "$file" 2>/dev/null; then
      git add "$file"
      echo "  ✓ 采用上游: $file"
      ((SUCCESS_COUNT++))
    else
      echo "  ✗ 失败: $file"
    fi
  done
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "=== 自动处理完成 ==="
  echo "  已处理: $SUCCESS_COUNT 个文件"
  echo "  剩余: ${#NEED_MANUAL[@]} 个文件需要手动处理"
  echo ""
  echo "下一步："
  echo "  1. 手动编辑剩余冲突文件"
  echo "  2. 对每个解决的文件运行: git add <file>"
  echo "  3. 完成后运行: git merge --continue"
else
  echo "已取消自动处理。请手动解决冲突。"
fi
