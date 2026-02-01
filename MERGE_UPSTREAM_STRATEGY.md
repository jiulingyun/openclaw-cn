# 上游合并策略指南

## 概述

本文档提供了安全合并 [openclaw/openclaw](https://github.com/openclaw/openclaw) 上游更新的详细策略。当前上游已领先本项目约 **480+ 提交**，需要谨慎处理以避免破坏已有的中文本地化和新增功能。

## 当前状态分析

### 差异统计
- **文件变更数量**: 3815 个文件
- **上游提交数**: 8543 个提交
- **本地提交数**: 1 个提交（grafted history）
- **主要差异类型**:
  - 包名更改: `openclaw` → `openclaw-cn`
  - 命令名更改: `openclaw` → `openclaw-cn` / `clawdbot-cn`
  - 文档本地化: README, 配置文件, 用户界面文本
  - 构建流程修改: GitHub Actions, Docker 配置
  - 域名更改: `openclaw.ai` → `clawd.org.cn`

### 关键本地化改动

1. **包配置**
   - `package.json`: 包名、版本号、bin 命令、描述
   - 二进制命令别名: `openclaw-cn`, `clawdbot-cn`

2. **文档**
   - README.md: 完全中文化
   - docs/: 文档网站本地化
   - 品牌标识和域名修改

3. **配置文件**
   - `.env.example`: 示例配置
   - GitHub workflows: 自定义 CI/CD 流程
   - Docker 相关文件

4. **用户界面**
   - CLI 提示文本
   - Web 控制界面
   - 错误消息和帮助文本

## 推荐合并策略

### 方案一：基于 Git Merge 的三方合并（推荐）

这是**最安全**的方案，利用 Git 的三方合并算法自动处理大部分冲突，同时保留完整的提交历史。

#### 优点
- ✅ 保留完整的 Git 历史
- ✅ Git 自动处理大部分非冲突更改
- ✅ 可以逐步解决冲突
- ✅ 易于回滚
- ✅ 便于追踪上游更新来源

#### 缺点
- ⚠️ 需要手动解决冲突（预计较多）
- ⚠️ 合并提交会引入大量上游历史

#### 执行步骤

```bash
# 1. 确保工作区干净
git status
git stash  # 如有未提交的更改

# 2. 创建备份分支
git checkout main
git branch backup-before-merge

# 3. 创建合并分支
git checkout -b merge-upstream-$(date +%Y%m%d)

# 4. 查找共同祖先（如果历史是 grafted，可能需要手动指定）
# 检查上游某个旧版本作为基准点
git log --oneline upstream/main | tail -100

# 5. 执行合并（预期会有大量冲突）
git merge upstream/main --no-ff -m "merge: sync with upstream openclaw/openclaw"

# 6. 处理冲突（见下方"冲突解决策略"）
# Git 会标记所有冲突文件
git status

# 7. 对于每个冲突文件
git diff --name-only --diff-filter=U  # 列出所有冲突文件

# 8. 解决冲突后
git add <resolved-file>

# 9. 所有冲突解决后，完成合并
git merge --continue

# 10. 测试合并结果
pnpm install
pnpm build
pnpm test

# 11. 推送到远程
git push origin merge-upstream-$(date +%Y%m%d)
```

### 方案二：Cherry-pick 重要更新（保守策略）

如果完整合并风险太大，可以选择性地 cherry-pick 重要的 bug 修复和功能更新。

#### 优点
- ✅ 风险最低
- ✅ 完全控制引入的更改
- ✅ 避免大规模冲突

#### 缺点
- ⚠️ 需要手动筛选提交
- ⚠️ 可能遗漏重要更新
- ⚠️ 长期维护成本高

#### 执行步骤

```bash
# 1. 查看上游重要更新
git log --oneline upstream/main --since="2025-01-01" --grep="fix:"
git log --oneline upstream/main --since="2025-01-01" --grep="security:"

# 2. 识别关键提交
# 查看具体提交内容
git show <commit-hash>

# 3. Cherry-pick 选定的提交
git checkout main
git cherry-pick <commit-hash>

# 4. 解决冲突（如有）
git status
git add <resolved-file>
git cherry-pick --continue

# 5. 重复步骤 3-4 直到完成所有重要更新
```

### 方案三：Rebase 策略（高级用户）

将本地更改 rebase 到最新的上游分支上。

#### 优点
- ✅ 保持线性历史
- ✅ 本地更改显示为最新提交

#### 缺点
- ⚠️ 需要重写历史（如果已推送则不推荐）
- ⚠️ 冲突解决较复杂
- ⚠️ 风险较高

#### 执行步骤

```bash
# 仅在本地分支或可以强制推送的情况下使用
git checkout main
git rebase upstream/main

# 解决每个提交的冲突
# 对于每个冲突：
git add <resolved-file>
git rebase --continue

# 或中止 rebase
git rebase --abort
```

### 方案四：手动合并脚本辅助（最灵活）

创建一个自定义脚本来处理已知的本地化差异。

#### 执行步骤

见下方"合并辅助脚本"部分。

## 冲突解决策略

### 自动解决策略

对于某些类型的冲突，可以使用预定义的策略：

```bash
# 1. 对于纯上游文件（无本地化），保留上游版本
git checkout --theirs <file>

# 2. 对于纯本地文件（新增的中文文档），保留本地版本
git checkout --ours <file>

# 3. 对于需要合并的文件，使用合并工具
git mergetool
```

### 文件分类处理建议

#### A. 完全保留本地版本的文件

这些文件是本地化特有的，应该保留本地版本：

```
README.md                          # 完全中文化
FEISHU_NPM_READY.md               # 本地新增
.github/workflows/npm-publish.yml  # 自定义发布流程
.github/workflows/docker-build-multiarch.yml  # 自定义 Docker 构建
package.json                       # 包名和命令已修改
```

```bash
# 批量处理
for file in README.md FEISHU_NPM_READY.md package.json; do
  git checkout --ours $file
  git add $file
done
```

#### B. 完全采用上游版本的文件

核心功能代码，无本地化修改，应采用上游最新版本：

```
src/infra/                        # 基础设施代码
src/media/                        # 媒体处理
src/providers/                    # AI 提供商集成
```

```bash
# 示例：采用上游版本
git checkout --theirs src/infra/某个文件.ts
git add src/infra/某个文件.ts
```

#### C. 需要手动合并的文件

这些文件既有上游更新，又有本地化修改：

```
src/cli/                          # CLI 命令（可能有中文提示）
src/gateway/                      # 网关核心（可能有配置差异）
docs/                             # 文档（需要保留中文化同时更新内容）
```

对于这类文件：

1. **使用合并标记手动编辑**：
   ```
   <<<<<<< HEAD (当前本地)
   中文提示文本
   =======
   English prompt text
   >>>>>>> upstream/main
   ```

2. **策略**：保留中文文本，但确保逻辑与上游一致

3. **示例**：
   ```typescript
   // 本地版本
   console.log("配置已保存");
   
   // 上游版本（可能改了函数签名）
   logger.info("Configuration saved");
   
   // 合并后
   logger.info("配置已保存");  // 使用新的 logger 但保留中文
   ```

### 特殊处理：package.json

`package.json` 是最关键的文件，需要特别小心：

```bash
# 1. 保存本地版本
cp package.json package.json.local

# 2. 保存上游版本
git show upstream/main:package.json > package.json.upstream

# 3. 手动合并
# - name: 保持 "openclaw-cn"
# - version: 使用上游版本号，加上 "-cn.N" 后缀
# - bin: 保持 "openclaw-cn" 和 "clawdbot-cn"
# - dependencies: 合并两者（上游的依赖 + 本地新增的依赖）
# - scripts: 合并两者

# 4. 验证 package.json 语法
pnpm install --dry-run
```

### 特殊处理：文档目录

```bash
# 对于 docs/ 目录
# 1. 创建对比
git diff upstream/main..HEAD -- docs/ > docs-diff.patch

# 2. 策略
# - 完全本地化的页面：保留本地版本
# - 技术文档：采用上游版本，然后重新翻译（可选）
# - 新增页面：保留本地的，补充上游新增的

# 3. 可能需要删除一些上游已删除但本地还保留的文件
git diff upstream/main..HEAD --name-status -- docs/ | grep "^D"
```

## 合并辅助脚本

### 冲突文件分类脚本

创建 `scripts/classify-conflicts.sh`：

```bash
#!/bin/bash
# 分类冲突文件，帮助批量处理

echo "=== 正在分析冲突文件 ==="

# 列出所有冲突文件
CONFLICTS=$(git diff --name-only --diff-filter=U)

# 分类
KEEP_OURS=()
KEEP_THEIRS=()
NEED_MANUAL=()

for file in $CONFLICTS; do
  case "$file" in
    README.md|FEISHU_NPM_READY.md)
      KEEP_OURS+=("$file")
      ;;
    package.json|.github/workflows/*.yml)
      NEED_MANUAL+=("$file")
      ;;
    src/infra/*|src/media/*|src/providers/*)
      KEEP_THEIRS+=("$file")
      ;;
    *)
      NEED_MANUAL+=("$file")
      ;;
  esac
done

echo ""
echo "=== 建议保留本地版本 (${#KEEP_OURS[@]} 个文件) ==="
printf '%s\n' "${KEEP_OURS[@]}"

echo ""
echo "=== 建议采用上游版本 (${#KEEP_THEIRS[@]} 个文件) ==="
printf '%s\n' "${KEEP_THEIRS[@]}"

echo ""
echo "=== 需要手动处理 (${#NEED_MANUAL[@]} 个文件) ==="
printf '%s\n' "${NEED_MANUAL[@]}"

# 询问是否自动处理
echo ""
read -p "是否自动解决建议的文件? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  for file in "${KEEP_OURS[@]}"; do
    git checkout --ours "$file"
    git add "$file"
    echo "✓ 保留本地: $file"
  done
  
  for file in "${KEEP_THEIRS[@]}"; do
    git checkout --theirs "$file"
    git add "$file"
    echo "✓ 采用上游: $file"
  done
  
  echo ""
  echo "=== 自动处理完成 ==="
  echo "剩余 ${#NEED_MANUAL[@]} 个文件需要手动处理"
fi
```

### 版本号同步脚本

创建 `scripts/sync-version.sh`：

```bash
#!/bin/bash
# 同步上游版本号，添加 -cn 后缀

UPSTREAM_VERSION=$(git show upstream/main:package.json | jq -r '.version')
CN_PATCH=$(cat package.json | jq -r '.version' | grep -oP 'cn\.\K\d+' || echo "0")
NEXT_CN_PATCH=$((CN_PATCH + 1))

NEW_VERSION="${UPSTREAM_VERSION}-cn.${NEXT_CN_PATCH}"

echo "上游版本: $UPSTREAM_VERSION"
echo "当前本地版本: $(jq -r '.version' package.json)"
echo "建议新版本: $NEW_VERSION"

read -p "是否更新版本号? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  # 使用 jq 更新 package.json
  jq ".version = \"$NEW_VERSION\"" package.json > package.json.tmp
  mv package.json.tmp package.json
  echo "✓ 版本号已更新为 $NEW_VERSION"
fi
```

## 测试和验证

合并完成后，必须进行全面测试：

### 1. 基础功能测试

```bash
# 安装依赖
pnpm install

# 类型检查
pnpm build

# 运行测试
pnpm test

# Lint 检查
pnpm lint
```

### 2. CLI 命令测试

```bash
# 验证命令可用性
pnpm openclaw-cn --version
pnpm openclaw-cn --help

# 测试核心命令
pnpm openclaw-cn config check
pnpm openclaw-cn models list
```

### 3. 构建测试

```bash
# Docker 构建
docker build -t openclaw-cn-test .

# npm 打包测试
npm pack
```

### 4. 文档检查

```bash
# 检查文档链接
# 确保所有中文化的文档路径正确
find docs -name "*.md" -exec grep -l "openclaw.ai" {} \;
# 应该替换为本地域名

# 检查 README
cat README.md | grep -E "(openclaw-cn|clawdbot-cn)"
```

## 维护建议

### 定期同步

建议建立定期同步机制：

```bash
# 创建每月同步提醒
# 添加到 GitHub Actions 或本地 cron
0 0 1 * * cd /path/to/openclaw-cn && git fetch upstream && \
  echo "上游新增 $(git rev-list --count HEAD..upstream/main) 个提交" | \
  mail -s "openclaw-cn 上游同步提醒" your@email.com
```

### 标记本地化提交

为了便于识别，在提交消息中添加标记：

```bash
git commit -m "i18n(zh-CN): 翻译配置向导提示文本"
git commit -m "feat(cn): 添加飞书部署文档"
```

### 创建 .gitattributes 合并策略

对于某些总是保留本地版本的文件：

```bash
# .gitattributes
README.md merge=ours
FEISHU_NPM_READY.md merge=ours
package.json merge=manual
```

配置 Git：

```bash
git config merge.ours.driver true
git config merge.manual.driver "echo '需要手动合并: %A'; false"
```

## 常见问题

### Q: 合并后编译失败怎么办？

A: 
1. 检查 TypeScript 类型错误：`pnpm build 2>&1 | tee build-errors.log`
2. 对比上游的 `tsconfig.json` 是否有更新
3. 检查依赖版本冲突：`pnpm list`

### Q: 如何回滚合并？

A:
```bash
# 如果还未推送
git reset --hard backup-before-merge

# 如果已推送
git revert -m 1 <merge-commit-hash>
```

### Q: 冲突太多，无法处理怎么办？

A: 考虑分阶段合并：
1. 先合并到特定日期的提交
2. 测试稳定后，再合并下一批
3. 使用 `git merge <commit-hash>` 而不是直接合并 HEAD

### Q: 如何处理上游删除但本地需要保留的文件？

A:
```bash
# 在合并时恢复文件
git checkout HEAD -- path/to/file
git add path/to/file
```

## 后续步骤

合并完成并测试通过后：

1. ✅ 更新 CHANGELOG.md，记录本次上游同步
2. ✅ 打标签：`git tag v2026.1.31-cn.1`
3. ✅ 发布到 npm：`npm publish`
4. ✅ 更新文档，说明新版本包含的上游更新
5. ✅ 通知用户升级

## 总结

上游合并是一个需要谨慎处理的过程。建议：

1. **首选方案一（Git Merge）**，它最安全且可追溯
2. **做好备份**，创建分支和标签
3. **分类处理冲突**，使用脚本辅助
4. **充分测试**，确保功能完整
5. **记录过程**，便于未来参考

如有任何问题，请参考 Git 文档或寻求社区帮助。

---

**文档版本**: 1.0  
**最后更新**: 2026-02-01  
**适用版本**: openclaw-cn based on openclaw 2026.1.30
