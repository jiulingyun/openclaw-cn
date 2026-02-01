# 上游合并辅助工具

本目录包含用于安全合并上游 [openclaw/openclaw](https://github.com/openclaw/openclaw) 更新的辅助脚本。

## 工具列表

### 1. `merge-wizard.sh` - 交互式合并向导 ⭐ 推荐

**用途**: 提供交互式的逐步引导，帮助完成整个合并流程。

**使用方法**:
```bash
./scripts/merge-helpers/merge-wizard.sh
```

**功能**:
- ✅ 自动运行预检查
- ✅ 创建备份分支
- ✅ 配置上游远程
- ✅ 提供多种合并策略选择
- ✅ 自动处理冲突（可选）
- ✅ 同步版本号
- ✅ 运行测试验证

**适合**: 首次合并或不确定步骤的用户

---

### 2. `pre-merge-check.sh` - 合并预检查

**用途**: 在开始合并前检查环境和仓库状态。

**使用方法**:
```bash
./scripts/merge-helpers/pre-merge-check.sh
```

**检查项**:
- Git 仓库状态
- 工作区是否干净
- upstream 远程配置
- 必要工具安装（jq, git, node, pnpm）
- Node.js 版本
- 磁盘空间
- 备份分支存在性
- 关键文件完整性

**退出码**:
- `0`: 检查通过
- `1`: 发现错误，需要修复

---

### 3. `classify-conflicts.sh` - 冲突文件分类

**用途**: 在合并产生冲突时，自动分类冲突文件并提供处理建议。

**使用方法**:
```bash
# 在合并产生冲突后运行
git merge upstream/main
./scripts/merge-helpers/classify-conflicts.sh
```

**功能**:
- 将冲突文件分为三类:
  - **保留本地**: 完全本地化的文件（如 README.md）
  - **采用上游**: 核心功能代码（如 src/infra/）
  - **需要手动处理**: 混合文件（如 package.json, CLI 文件）
- 可选自动解决简单冲突
- 显示剩余需手动处理的文件

**分类规则**:
```
保留本地:
  - README.md, FEISHU_NPM_READY.md
  - docs/CNAME, docs/_config.yml
  - .github/workflows/npm-publish.yml
  - .github/workflows/docker-build-multiarch.yml

采用上游:
  - src/infra/*
  - src/media/*
  - src/providers/*
  - test/**/*.test.ts

手动处理:
  - package.json
  - .env.example
  - src/cli/*
  - src/gateway/*
  - src/commands/*
```

---

### 4. `sync-version.sh` - 版本号同步

**用途**: 自动同步上游版本号并添加 `-cn.N` 后缀。

**使用方法**:
```bash
./scripts/merge-helpers/sync-version.sh
```

**功能**:
- 读取上游最新版本号
- 计算下一个中文版本号
- 更新 package.json
- 可选创建 git commit 和 tag

**版本格式**:
```
上游版本: 2026.1.30
当前版本: 2026.1.24-cn.3
新版本:   2026.1.30-cn.1
```

---

## 使用场景

### 场景 1: 首次合并（推荐使用向导）

```bash
# 使用交互式向导
./scripts/merge-helpers/merge-wizard.sh
```

### 场景 2: 手动分步合并

```bash
# 1. 预检查
./scripts/merge-helpers/pre-merge-check.sh

# 2. 创建备份和合并分支
git branch backup-before-merge
git checkout -b merge-upstream-$(date +%Y%m%d)

# 3. 配置 upstream（如果未配置）
git remote add upstream https://github.com/openclaw/openclaw
git fetch upstream

# 4. 执行合并
git merge upstream/main --no-ff -m "merge: sync with upstream"

# 5. 处理冲突
./scripts/merge-helpers/classify-conflicts.sh

# 6. 手动解决剩余冲突
# ... 编辑文件 ...
git add <resolved-files>
git merge --continue

# 7. 同步版本号
./scripts/merge-helpers/sync-version.sh

# 8. 测试
pnpm install
pnpm build
pnpm test
```

### 场景 3: 仅检查状态

```bash
# 只运行预检查，不执行合并
./scripts/merge-helpers/pre-merge-check.sh
```

### 场景 4: 合并后版本号同步

```bash
# 合并完成后，单独运行版本同步
./scripts/merge-helpers/sync-version.sh
```

---

## 依赖要求

所有脚本需要以下工具:

- **bash** (≥ 4.0)
- **git**
- **jq** (JSON 处理)
  - Ubuntu/Debian: `sudo apt-get install jq`
  - macOS: `brew install jq`
- **node** (≥ 22)
- **pnpm** (推荐，可选)

---

## 故障排除

### 问题: pre-merge-check.sh 报错 "upstream 未配置"

**解决**:
```bash
git remote add upstream https://github.com/openclaw/openclaw
git fetch upstream
```

### 问题: classify-conflicts.sh 没有检测到冲突

**原因**: 可能合并没有冲突，或者冲突已经解决。

**检查**:
```bash
git status
git diff --name-only --diff-filter=U
```

### 问题: sync-version.sh 报错 "需要 jq"

**解决**:
```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq

# 验证安装
jq --version
```

### 问题: 合并后测试失败

**步骤**:
1. 检查构建错误: `pnpm build 2>&1 | tee build.log`
2. 查看具体测试失败: `pnpm test -- --reporter=verbose`
3. 对比上游的依赖变化: `git diff upstream/main..HEAD package.json`
4. 重新安装依赖: `rm -rf node_modules && pnpm install`

---

## 高级用法

### 自定义冲突分类规则

编辑 `classify-conflicts.sh` 中的 case 语句来调整分类规则:

```bash
case "$file" in
  # 添加新规则
  你的/自定义/路径/*)
    KEEP_OURS+=("$file")
    ;;
  ...
esac
```

### 批量处理特定类型冲突

```bash
# 批量保留本地版本（docs 目录）
git diff --name-only --diff-filter=U | grep "^docs/" | xargs -I {} git checkout --ours {}
git diff --name-only --diff-filter=U | grep "^docs/" | xargs git add

# 批量采用上游版本（src/infra 目录）
git diff --name-only --diff-filter=U | grep "^src/infra/" | xargs -I {} git checkout --theirs {}
git diff --name-only --diff-filter=U | grep "^src/infra/" | xargs git add
```

### 部分合并（合并到指定提交）

```bash
# 查看上游历史
git log --oneline upstream/main -50

# 合并到特定提交
git merge <commit-hash> --no-ff -m "merge: partial sync to <commit-hash>"
```

---

## 更多信息

- 详细合并策略: [../MERGE_UPSTREAM_STRATEGY.md](../MERGE_UPSTREAM_STRATEGY.md)
- 上游项目: https://github.com/openclaw/openclaw
- 本项目: https://github.com/jiulingyun/openclaw-cn

---

**维护者**: openclaw-cn 团队  
**最后更新**: 2026-02-01
