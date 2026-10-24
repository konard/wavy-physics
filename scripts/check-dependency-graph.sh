#!/usr/bin/env bash
# check-dependency-graph.sh
#
# Probes the dependency graph that actions/dependency-review-action reads.
# A repository admin has to enable it once in the repository settings;
# no workflow can change that setting, so this gate reports what to do.
#
# Usage:
#   bash scripts/check-dependency-graph.sh warn     # pull requests
#   bash scripts/check-dependency-graph.sh require  # main, schedule
#
# Environment:
#   GH_TOKEN           token with contents: read
#   GITHUB_REPOSITORY  owner/name
#   BASE_SHA, HEAD_SHA commits to compare (the same SHA twice is fine)
#   GITHUB_OUTPUT      receives enabled=true|false (optional)
#
# Exit codes:
#   0 = graph enabled, or disabled in warn mode
#   1 = graph disabled in require mode, or the probe itself failed

set -euo pipefail

mode="${1:-}"
if [ "$mode" != warn ] && [ "$mode" != require ]; then
  echo "usage: check-dependency-graph.sh warn|require" >&2
  exit 1
fi

output="${GITHUB_OUTPUT:-/dev/null}"
settings="https://github.com/${GITHUB_REPOSITORY}/settings/security_analysis"
endpoint="repos/${GITHUB_REPOSITORY}/dependency-graph/compare/${BASE_SHA}...${HEAD_SHA}"

if response=$(gh api "$endpoint" 2>&1); then
  echo "Dependency graph is enabled for ${GITHUB_REPOSITORY}."
  echo "enabled=true" >>"$output"
  exit 0
fi

# 403 and 404 are how the API reports a disabled graph; anything else is
# a probe failure that must stay red.
if ! printf '%s' "$response" | grep -Eq 'HTTP 40[34]'; then
  echo "::error::Dependency graph probe failed: ${response}"
  exit 1
fi

echo "enabled=false" >>"$output"
message="The dependency graph is disabled for ${GITHUB_REPOSITORY}, so dependency review cannot run. A repository admin must open ${settings} and enable Dependency graph."

if [ "$mode" = require ]; then
  echo "::error::${message}"
  exit 1
fi

echo "::warning::${message} Dependency review is skipped on this pull request; the Security workflow on main stays red until the setting is enabled."
