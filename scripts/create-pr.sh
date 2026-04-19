#!/bin/bash
# Create a GitHub PR with REEL-[number] ticket format in the title.
# Requires: gh CLI authenticated (gh auth login)
# Usage: bash scripts/create-pr.sh

set -euo pipefail

command -v gh >/dev/null 2>&1 || { echo "❌ gh CLI not found. Install: https://cli.github.com"; exit 1; }

# ── Collect input ─────────────────────────────────────────────────────────────

read -rp "Ticket number (e.g. 12 → REEL-12): " TICKET_NUM
if ! [[ "$TICKET_NUM" =~ ^[0-9]+$ ]]; then
  echo "❌ Ticket number must be an integer."
  exit 1
fi
TICKET="REEL-${TICKET_NUM}"

echo ""
echo "PR type:"
select TYPE in feat fix refactor chore test ci docs; do
  [[ -n "$TYPE" ]] && break
done

read -rp "Short description (e.g. 'add movie view event publisher'): " DESC
if [[ -z "$DESC" ]]; then
  echo "❌ Description cannot be empty."
  exit 1
fi

read -rp "Target branch [main]: " BASE_BRANCH
BASE_BRANCH="${BASE_BRANCH:-main}"

# ── Derive values ─────────────────────────────────────────────────────────────

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
PR_TITLE="${TICKET} ${TYPE}: ${DESC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Branch : $CURRENT_BRANCH → $BASE_BRANCH"
echo " Title  : $PR_TITLE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -rp "Create PR? [y/N]: " CONFIRM
[[ "${CONFIRM,,}" == "y" ]] || { echo "Aborted."; exit 0; }

# ── Push branch if needed ─────────────────────────────────────────────────────

if ! git ls-remote --exit-code --heads origin "$CURRENT_BRANCH" >/dev/null 2>&1; then
  echo "Pushing branch to origin..."
  git push -u origin "$CURRENT_BRANCH"
fi

# ── Create PR ─────────────────────────────────────────────────────────────────

PR_URL=$(gh pr create \
  --title "$PR_TITLE" \
  --base "$BASE_BRANCH" \
  --body "$(cat .github/pull_request_template.md | sed "s/REEL-\[NUMBER\]/$TICKET/g")")

echo ""
echo "✅ PR created: $PR_URL"
