#!/bin/bash
# 交互式上游合并向导
# Usage: ./merge-wizard.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║                  上游合并向导                              ║${NC}"
echo -e "${BOLD}║        openclaw/openclaw → jiulingyun/openclaw-cn         ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 步骤计数
STEP=1

print_step() {
  echo -e "\n${BLUE}${BOLD}[步骤 $STEP]${NC} $1"
  ((STEP++))
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

ask_continue() {
  echo ""
  read -p "继续? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已退出向导"
    exit 0
  fi
}

# 运行预检查
print_step "运行预检查..."
if [ -f "scripts/merge-helpers/pre-merge-check.sh" ]; then
  if ./scripts/merge-helpers/pre-merge-check.sh; then
    print_success "预检查通过"
  else
    print_error "预检查失败，请先解决问题"
    exit 1
  fi
else
  print_warning "未找到预检查脚本，跳过"
fi

ask_continue

# 创建备份
print_step "创建备份分支..."
CURRENT_BRANCH=$(git branch --show-current)
if git branch | grep -q "backup-before-merge"; then
  print_warning "备份分支已存在"
else
  git branch backup-before-merge
  print_success "已创建备份分支: backup-before-merge"
fi

ask_continue

# 确保 upstream 已配置
print_step "配置上游远程仓库..."
if ! git remote | grep -q "^upstream$"; then
  read -p "输入上游仓库 URL (默认: https://github.com/openclaw/openclaw): " UPSTREAM_URL
  UPSTREAM_URL=${UPSTREAM_URL:-https://github.com/openclaw/openclaw}
  git remote add upstream "$UPSTREAM_URL"
  print_success "已添加 upstream: $UPSTREAM_URL"
else
  UPSTREAM_URL=$(git remote get-url upstream)
  print_success "upstream 已配置: $UPSTREAM_URL"
fi

ask_continue

# 获取上游更新
print_step "获取上游更新..."
echo "正在从 upstream 获取最新更新..."
git fetch upstream
COMMITS_BEHIND=$(git rev-list --count HEAD..upstream/main 2>/dev/null || echo "unknown")
print_success "获取完成，上游领先 $COMMITS_BEHIND 个提交"

ask_continue

# 创建合并分支
print_step "创建合并分支..."
MERGE_BRANCH="merge-upstream-$(date +%Y%m%d)"
if git branch | grep -q "$MERGE_BRANCH"; then
  print_warning "分支 $MERGE_BRANCH 已存在"
  read -p "是否使用已存在的分支? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git checkout "$MERGE_BRANCH"
  else
    read -p "输入新的分支名: " MERGE_BRANCH
    git checkout -b "$MERGE_BRANCH"
  fi
else
  git checkout -b "$MERGE_BRANCH"
  print_success "已创建并切换到分支: $MERGE_BRANCH"
fi

ask_continue

# 选择合并策略
print_step "选择合并策略..."
echo ""
echo "请选择合并策略:"
echo "  1) 完整合并 (推荐) - 合并所有上游更新"
echo "  2) 部分合并 - 仅合并到指定的提交"
echo "  3) Cherry-pick - 选择性合并特定提交"
echo ""
read -p "选择 (1-3): " -n 1 STRATEGY
echo ""

case $STRATEGY in
  1)
    print_step "执行完整合并..."
    echo "正在合并 upstream/main..."
    if git merge upstream/main --no-ff -m "merge: sync with upstream openclaw/openclaw"; then
      print_success "合并成功，没有冲突！"
      MERGE_STATUS="success"
    else
      print_warning "合并产生冲突，需要手动解决"
      MERGE_STATUS="conflict"
    fi
    ;;
  
  2)
    print_step "部分合并..."
    echo "最近的上游提交:"
    git log --oneline upstream/main -20
    echo ""
    read -p "输入要合并到的提交哈希: " TARGET_COMMIT
    if git merge "$TARGET_COMMIT" --no-ff -m "merge: sync with upstream until $TARGET_COMMIT"; then
      print_success "合并成功！"
      MERGE_STATUS="success"
    else
      print_warning "合并产生冲突"
      MERGE_STATUS="conflict"
    fi
    ;;
  
  3)
    print_step "Cherry-pick 模式..."
    echo "最近的上游提交:"
    git log --oneline upstream/main -30
    echo ""
    echo "输入要 cherry-pick 的提交哈希（每行一个，输入空行结束）:"
    COMMITS=()
    while read -r commit; do
      [ -z "$commit" ] && break
      COMMITS+=("$commit")
    done
    
    for commit in "${COMMITS[@]}"; do
      echo "Cherry-picking $commit..."
      if git cherry-pick "$commit"; then
        print_success "✓ $commit"
      else
        print_warning "冲突: $commit"
        echo "请解决冲突后按回车继续..."
        read
      fi
    done
    MERGE_STATUS="cherrypick"
    ;;
  
  *)
    print_error "无效选择"
    exit 1
    ;;
esac

# 处理冲突
if [ "$MERGE_STATUS" = "conflict" ]; then
  print_step "解决冲突..."
  echo ""
  echo "检测到合并冲突。运行冲突分类工具..."
  
  if [ -f "scripts/merge-helpers/classify-conflicts.sh" ]; then
    ./scripts/merge-helpers/classify-conflicts.sh
  else
    print_warning "未找到冲突分类工具"
    git status
  fi
  
  echo ""
  echo "手动解决剩余冲突后，运行以下命令继续:"
  echo "  git add <resolved-file>"
  echo "  git merge --continue"
  echo ""
  echo "或者运行以下命令中止合并:"
  echo "  git merge --abort"
  echo ""
  echo "解决完成后，重新运行此向导继续后续步骤"
  exit 0
fi

# 版本号同步
print_step "同步版本号..."
if [ -f "scripts/merge-helpers/sync-version.sh" ]; then
  ./scripts/merge-helpers/sync-version.sh
else
  print_warning "未找到版本同步工具，跳过"
fi

ask_continue

# 测试
print_step "运行测试..."
echo "安装依赖..."
if pnpm install; then
  print_success "依赖安装成功"
else
  print_error "依赖安装失败"
  exit 1
fi

echo ""
echo "构建项目..."
if pnpm build; then
  print_success "构建成功"
else
  print_error "构建失败，请检查错误"
  exit 1
fi

echo ""
read -p "是否运行测试? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  if pnpm test; then
    print_success "测试通过"
  else
    print_warning "测试失败，请检查"
  fi
fi

# 总结
print_step "合并完成！"
echo ""
echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║                    合并成功！                              ║${NC}"
echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "下一步操作:"
echo "  1. 检查合并结果: git log --oneline -20"
echo "  2. 查看更改: git diff $CURRENT_BRANCH"
echo "  3. 推送到远程: git push origin $MERGE_BRANCH"
echo "  4. 创建 Pull Request 进行代码审查"
echo "  5. 合并到 main: git checkout main && git merge $MERGE_BRANCH"
echo ""
echo "如需回滚:"
echo "  git checkout $CURRENT_BRANCH"
echo "  git branch -D $MERGE_BRANCH"
echo "  # 或恢复备份: git reset --hard backup-before-merge"
echo ""
echo "更多信息请查看: MERGE_UPSTREAM_STRATEGY.md"
