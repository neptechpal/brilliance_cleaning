#!/usr/bin/env bash
# Run on the server from the project directory: ./deploy.sh
# Pulls main, installs, syncs the DB schema, rebuilds and restarts the service.
set -euo pipefail
cd "$(dirname "$0")"
export PATH=/root/.nvm/versions/node/v22.23.4/bin:$PATH

git pull --ff-only
npm ci --no-audit --no-fund
npx prisma db push
NODE_ENV=production npx next build
systemctl restart brilliance.service
sleep 3
systemctl is-active brilliance.service
