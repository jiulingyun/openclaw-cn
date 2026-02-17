#!/usr/bin/env bash
# upstream-extract-commits.sh - 从上游两个 tag 之间提取 commit 并映射到 PR
#
# 用法:
#   ./scripts/upstream-extract-commits.sh --auto v2026.2.16      # 从 last-upstream-tag 到指定版本
#   ./scripts/upstream-extract-commits.sh --auto latest           # 从 last-upstream-tag 到上游最新 tag
#   ./scripts/upstream-extract-commits.sh v2026.1.29 v2026.2.15   # 手动指定范围
#   ./scripts/upstream-extract-commits.sh v2026.1.29 v2026.2.15 --filter security
#   ./scripts/upstream-extract-commits.sh v2026.1.29 v2026.2.15 --checklist
#
# 输出: JSON 格式的 commit 映射，或追加到 UPSTREAM_MERGE_CHECKLIST.md
#
# 依赖: git, jq

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LAST_TAG_FILE="$REPO_ROOT/.github/last-upstream-tag"

# ============================================================
# --auto 模式：自动从 last-upstream-tag 读取基准版本
# ============================================================

if [[ "${1:-}" == "--auto" ]]; then
  if [ ! -f "$LAST_TAG_FILE" ]; then
    echo "❌ 未找到 $LAST_TAG_FILE，请先设置基准版本或手动指定 from-tag" >&2
    exit 1
  fi
  FROM_TAG=$(cat "$LAST_TAG_FILE" | tr -d '[:space:]')
  TO_TAG="${2:-latest}"
  if [[ "$TO_TAG" == "latest" ]]; then
    # 获取上游最新的非预发布 tag
    TO_TAG=$(git tag -l 'v*' --sort=-version:refname | grep -v '-' | head -1)
    echo "📌 上游最新 tag: $TO_TAG" >&2
  fi
  echo "📌 基准版本 (from last-upstream-tag): $FROM_TAG" >&2
  
  if [[ "$FROM_TAG" == "$TO_TAG" ]]; then
    echo "✅ 已是最新版本，无需提取" >&2
    exit 0
  fi
  
  shift 2 2>/dev/null || shift 1
else
  FROM_TAG="${1:?用法: $0 <from-tag> <to-tag> | --auto [to-tag|latest]}"
  TO_TAG="${2:?用法: $0 <from-tag> <to-tag> | --auto [to-tag|latest]}"
  shift 2
fi

FILTER="${1:-}"
FILTER_VALUE="${2:-}"
OUTPUT_FORMAT="json"

if [[ "$FILTER" == "--checklist" ]]; then
  OUTPUT_FORMAT="checklist"
  FILTER=""
elif [[ "${3:-}" == "--checklist" ]]; then
  OUTPUT_FORMAT="checklist"
fi

COMMIT_MAP_DIR="$REPO_ROOT/.github/upstream-commits"
mkdir -p "$COMMIT_MAP_DIR"
MAP_FILE="$COMMIT_MAP_DIR/${FROM_TAG}..${TO_TAG}.json"

# ============================================================
# 分类规则（与 upstream-monitor.yml AI prompt 保持一致）
# ============================================================

categorize_commit() {
  local msg="$1"
  local files="$2"
  local category="UNKNOWN"
  local priority="P3"
  local action="OPTIONAL"

  # --- P0 安全修复 ---
  if echo "$msg" | grep -qiE 'security|XSS|SSRF|redact|sanitiz|injection|traversal|auth.*(fix|harden)|CSRF|CVE'; then
    category="SECURITY"
    priority="P0"
    action="MERGE"
  # --- P1 核心引擎 bug ---
  elif echo "$msg" | grep -qiE '^fix\(?(gateway|agent|session|cron|heartbeat|compact|memory|sandbox|config|subagent|browser)'; then
    category="CRITICAL-BUG"
    priority="P1"
    action="MERGE"
  # --- P1 Telegram 修复 ---
  elif echo "$msg" | grep -qiE '^fix\(?telegram'; then
    category="CHANNEL-FIX"
    priority="P1"
    action="MERGE"
  # --- P1 WhatsApp/Web/TUI 修复 ---
  elif echo "$msg" | grep -qiE '^fix\(?(whatsapp|web|tui|auto-reply)'; then
    category="CHANNEL-FIX"
    priority="P1"
    action="MERGE"
  # --- P1 CJK/Unicode 修复 ---
  elif echo "$msg" | grep -qiE 'CJK|Unicode|中文|chinese|cjk|unicode.*aware'; then
    category="CRITICAL-BUG"
    priority="P1"
    action="MERGE"
  # --- P2 飞书修复（需人工对比本地实现） ---
  elif echo "$msg" | grep -qiE 'feishu|飞书|lark'; then
    category="CHANNEL-FIX"
    priority="P2"
    action="REVIEW"
  # --- 跳过 不使用的渠道 ---
  elif echo "$msg" | grep -qiE 'bluebubbles|tlon|nostr|msteams|teams|twitch|googlechat|imessage|mattermost|nextcloud|line\b'; then
    category="UNUSED-CHANNEL"
    priority="P5"
    action="SKIP"
  # --- 跳过 Discord (中国大陆不可用) ---
  elif echo "$msg" | grep -qiE '^(fix|feat|refactor)\(?discord'; then
    category="UNUSED-CHANNEL"
    priority="P5"
    action="SKIP"
  # --- 跳过 Signal/Slack ---
  elif echo "$msg" | grep -qiE '^(fix|feat|refactor)\(?(signal|slack)\b'; then
    category="UNUSED-CHANNEL"
    priority="P5"
    action="SKIP"
  # --- 跳过 iOS/Android/macOS 原生应用 ---
  elif echo "$files" | grep -qE '^apps/(ios|android|macos)/'; then
    if ! echo "$msg" | grep -qiE 'CJK|Unicode|中文'; then
      category="NATIVE-APP"
      priority="P5"
      action="SKIP"
    fi
  # --- 跳过 CI/CD ---
  elif echo "$files" | grep -qE '^\.github/workflows/'; then
    category="CI-CD"
    priority="P5"
    action="SKIP"
  # --- 跳过 docs 变更（我们本地维护） ---
  elif echo "$files" | grep -qE '^docs/' && ! echo "$files" | grep -qvE '^docs/'; then
    category="DOCS"
    priority="P5"
    action="SKIP"
  # --- 跳过 纯测试代码 ---
  elif echo "$msg" | grep -qE '^test(\(|:)' && ! echo "$msg" | grep -qiE 'security|telegram|whatsapp|web|tui'; then
    category="TEST-ONLY"
    priority="P4"
    action="SKIP"
  # --- 跳过 纯格式/风格 ---
  elif echo "$msg" | grep -qE '^(style|chore|docs)(\(|:)'; then
    category="CHORE"
    priority="P5"
    action="SKIP"
  # --- P2 新功能/重构 ---
  elif echo "$msg" | grep -qE '^feat(\(|:)'; then
    category="NICE-TO-HAVE"
    priority="P3"
    action="OPTIONAL"
  elif echo "$msg" | grep -qE '^refactor(\(|:)'; then
    category="REFACTOR"
    priority="P3"
    action="OPTIONAL"
  fi

  echo "${action}|${priority}|${category}"
}

# ============================================================
# 提取 commit 列表
# ============================================================

echo "📋 提取 $FROM_TAG..$TO_TAG 之间的 commit..." >&2

# 获取所有 commit（排除 merge commit）
COMMITS=$(git log "$FROM_TAG..$TO_TAG" --no-merges --format="%H|%s" 2>/dev/null)
TOTAL=$(echo "$COMMITS" | wc -l | tr -d ' ')
echo "   总计 $TOTAL 个 commit" >&2

# ============================================================
# 分析每个 commit
# ============================================================

declare -a RESULTS=()
MERGE_COUNT=0
SKIP_COUNT=0
OPTIONAL_COUNT=0
REVIEW_COUNT=0
INDEX=0

while IFS='|' read -r SHA MSG; do
  [ -z "$SHA" ] && continue
  INDEX=$((INDEX + 1))

  # 获取该 commit 修改的文件列表
  FILES=$(git diff-tree --no-commit-id --name-only -r "$SHA" 2>/dev/null | tr '\n' ' ' || true)

  # 提取 PR 号
  PR=$(echo "$MSG" | grep -oE '#[0-9]+' | head -1 || true)

  # 分类
  RESULT=$(categorize_commit "$MSG" "$FILES")
  ACTION=$(echo "$RESULT" | cut -d'|' -f1)
  PRIORITY=$(echo "$RESULT" | cut -d'|' -f2)
  CATEGORY=$(echo "$RESULT" | cut -d'|' -f3)

  # 应用过滤器
  if [[ "$FILTER" == "--filter" && -n "$FILTER_VALUE" ]]; then
    case "$FILTER_VALUE" in
      security) [[ "$CATEGORY" != "SECURITY" ]] && continue ;;
      merge)    [[ "$ACTION" != "MERGE" ]] && continue ;;
      skip)     [[ "$ACTION" != "SKIP" ]] && continue ;;
      optional) [[ "$ACTION" != "OPTIONAL" ]] && continue ;;
      p0)       [[ "$PRIORITY" != "P0" ]] && continue ;;
      p1)       [[ "$PRIORITY" != "P1" ]] && continue ;;
      *)        echo "未知过滤器: $FILTER_VALUE" >&2; exit 1 ;;
    esac
  fi

  # 评估冲突风险（基于文件路径）
  RISK="LOW"
  if echo "$FILES" | grep -qE 'package\.json|pnpm-lock'; then
    RISK="MEDIUM"
  fi
  if echo "$FILES" | grep -qE 'extensions/feishu/|ui/src/ui/'; then
    RISK="HIGH"
  fi

  # 统计
  case "$ACTION" in
    MERGE) MERGE_COUNT=$((MERGE_COUNT + 1)) ;;
    SKIP) SKIP_COUNT=$((SKIP_COUNT + 1)) ;;
    OPTIONAL) OPTIONAL_COUNT=$((OPTIONAL_COUNT + 1)) ;;
    REVIEW) REVIEW_COUNT=$((REVIEW_COUNT + 1)) ;;
  esac

  # 关联 commit 检测：同一 PR 的其他 commit
  RELATED=""
  if [ -n "$PR" ]; then
    RELATED=$(echo "$COMMITS" | grep "$PR" | grep -v "$SHA" | cut -d'|' -f1 | tr '\n' ',' | sed 's/,$//' || true)
  fi

  # 构建 JSON 记录
  RECORD=$(jq -nc \
    --arg sha "$SHA" \
    --arg msg "$MSG" \
    --arg pr "$PR" \
    --arg action "$ACTION" \
    --arg priority "$PRIORITY" \
    --arg category "$CATEGORY" \
    --arg risk "$RISK" \
    --arg files "$FILES" \
    --arg related "$RELATED" \
    '{sha: $sha, message: $msg, pr: $pr, action: $action, priority: $priority, category: $category, conflict_risk: $risk, files: ($files | split(" ") | map(select(. != ""))), related_commits: ($related | split(",") | map(select(. != "")))}')

  RESULTS+=("$RECORD")

  # 进度
  if [ $((INDEX % 100)) -eq 0 ]; then
    echo "   已处理 $INDEX/$TOTAL..." >&2
  fi
done <<< "$COMMITS"

echo "" >&2
echo "📊 分析完成:" >&2
echo "   🔴 需要合并 (MERGE): $MERGE_COUNT" >&2
echo "   🔵 可选合并 (OPTIONAL): $OPTIONAL_COUNT" >&2
echo "   🟡 需人工审查 (REVIEW): $REVIEW_COUNT" >&2
echo "   ⚪ 跳过 (SKIP): $SKIP_COUNT" >&2

# ============================================================
# 输出
# ============================================================

if [[ "$OUTPUT_FORMAT" == "json" ]]; then
  # 输出 JSON 并保存映射文件
  printf '%s\n' "${RESULTS[@]}" | jq -s '.' | tee "$MAP_FILE"
  echo "" >&2
  echo "💾 映射已保存到: $MAP_FILE" >&2

elif [[ "$OUTPUT_FORMAT" == "checklist" ]]; then
  # 输出 Markdown 清单格式（仅 MERGE 和 OPTIONAL 条目）
  echo ""
  echo "## 自动提取条目 ($FROM_TAG → $TO_TAG)"
  echo ""
  echo "| 状态 | 优先级 | Commit | PR | 描述 | 类别 | 冲突风险 | 关联 |"
  echo "|------|--------|--------|-----|------|------|----------|------|"

  for r in "${RESULTS[@]}"; do
    ACTION=$(echo "$r" | jq -r '.action')
    [[ "$ACTION" == "SKIP" ]] && continue

    PRIORITY=$(echo "$r" | jq -r '.priority')
    SHA=$(echo "$r" | jq -r '.sha[:10]')
    PR=$(echo "$r" | jq -r '.pr // "N/A"')
    MSG=$(echo "$r" | jq -r '.message' | sed 's/|/\\|/g')
    CATEGORY=$(echo "$r" | jq -r '.category')
    RISK=$(echo "$r" | jq -r '.conflict_risk')
    RELATED=$(echo "$r" | jq -r '.related_commits | join(",")')
    [ "$RELATED" = "" ] && RELATED="-"

    STATUS="⬜"
    [ "$ACTION" = "OPTIONAL" ] && STATUS="🔲"
    [ "$ACTION" = "REVIEW" ] && STATUS="👁"

    echo "| $STATUS | $PRIORITY | \`$SHA\` | $PR | $MSG | $CATEGORY | $RISK | $RELATED |"
  done
fi
