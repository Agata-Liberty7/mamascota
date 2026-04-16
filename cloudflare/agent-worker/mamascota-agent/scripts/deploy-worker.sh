#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
cd cloudflare/agent-worker/mamascota-agent

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN is not set."
  echo "Add it to GitHub Codespaces secrets or export it in your shell."
  exit 1
fi

npx wrangler deploy
