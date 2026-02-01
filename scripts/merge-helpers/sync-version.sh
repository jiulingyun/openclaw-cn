#!/bin/bash
# 同步上游版本号，添加 -cn 后缀
# Usage: ./sync-version.sh

set -e

# 检查是否在 git 仓库中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "错误: 不在 git 仓库中"
  exit 1
fi

# 检查是否有 upstream 远程
if ! git remote | grep -q "^upstream$"; then
  echo "错误: 未找到 upstream 远程仓库"
  echo "请运行: git remote add upstream https://github.com/openclaw/openclaw"
  exit 1
fi

# 检查 jq 是否安装
if ! command -v jq &> /dev/null; then
  echo "错误: 需要安装 jq"
  echo "  Ubuntu/Debian: sudo apt-get install jq"
  echo "  macOS: brew install jq"
  exit 1
fi

echo "=== 版本号同步工具 ==="
echo ""

# 获取上游版本号
UPSTREAM_VERSION=$(git show upstream/main:package.json 2>/dev/null | jq -r '.version')
if [ -z "$UPSTREAM_VERSION" ] || [ "$UPSTREAM_VERSION" = "null" ]; then
  echo "错误: 无法读取上游版本号"
  echo "请先运行: git fetch upstream"
  exit 1
fi

# 获取当前版本号
CURRENT_VERSION=$(jq -r '.version' package.json)

# 提取当前的 cn patch 版本
if [[ $CURRENT_VERSION =~ -cn\.([0-9]+)$ ]]; then
  CN_PATCH=${BASH_REMATCH[1]}
else
  CN_PATCH=0
fi

# 计算下一个 patch 版本
NEXT_CN_PATCH=$((CN_PATCH + 1))
NEW_VERSION="${UPSTREAM_VERSION}-cn.${NEXT_CN_PATCH}"

# 显示版本信息
echo "上游版本:     $UPSTREAM_VERSION"
echo "当前本地版本: $CURRENT_VERSION"
echo "建议新版本:   $NEW_VERSION"
echo ""

# 询问是否更新
read -p "是否更新版本号? (y/N) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  # 备份原文件
  cp package.json package.json.backup
  
  # 使用 jq 更新 package.json
  if jq ".version = \"$NEW_VERSION\"" package.json > package.json.tmp; then
    mv package.json.tmp package.json
    echo "✓ 版本号已更新为 $NEW_VERSION"
    echo "  备份文件: package.json.backup"
    
    # 显示差异
    echo ""
    echo "=== 变更内容 ==="
    git diff package.json | grep version || true
    
    # 询问是否提交
    echo ""
    read -p "是否提交此更改? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      git add package.json
      git commit -m "chore: bump version to $NEW_VERSION (sync with upstream $UPSTREAM_VERSION)"
      echo "✓ 已提交版本更新"
      
      # 询问是否创建标签
      read -p "是否创建 git 标签? (y/N) " -n 1 -r
      echo
      if [[ $REPLY =~ ^[Yy]$ ]]; then
        TAG_NAME="v$NEW_VERSION"
        git tag -a "$TAG_NAME" -m "Release $NEW_VERSION (based on upstream $UPSTREAM_VERSION)"
        echo "✓ 已创建标签: $TAG_NAME"
        echo ""
        echo "推送标签: git push origin $TAG_NAME"
      fi
    else
      echo "已取消提交。如需恢复，运行: mv package.json.backup package.json"
    fi
  else
    echo "✗ 更新失败"
    rm -f package.json.tmp
    exit 1
  fi
else
  echo "已取消版本更新"
fi
