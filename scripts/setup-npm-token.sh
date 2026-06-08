#!/usr/bin/env bash
set -euo pipefail

# This script:
# 1. Logs you into NPM (opens browser or prompts for credentials)
# 2. Extracts the auth token
# 3. Stores it as a GitHub Actions secret (NPM_TOKEN)

REPO="mhusseini/dryvjs"

echo "==> Logging in to NPM..."
npm login

# Extract the token from ~/.npmrc
TOKEN=$(grep '//registry.npmjs.org/:_authToken=' ~/.npmrc | tail -1 | sed 's/.*_authToken=//')

if [ -z "$TOKEN" ]; then
  echo "ERROR: Could not extract NPM token from ~/.npmrc"
  exit 1
fi

echo "==> NPM token obtained."
echo "==> Storing token as GitHub secret 'NPM_TOKEN' for $REPO..."

if ! command -v gh &>/dev/null; then
  echo "ERROR: GitHub CLI (gh) is not installed. Install it from https://cli.github.com"
  echo "Then run: gh secret set NPM_TOKEN --repo $REPO"
  echo "And paste your token when prompted."
  exit 1
fi

echo "$TOKEN" | gh secret set NPM_TOKEN --repo "$REPO"

echo "==> Done! NPM_TOKEN secret is now set on GitHub for $REPO."
