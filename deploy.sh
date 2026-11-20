#!/usr/bin/env bash
# Manual deploy (normally GitHub Actions does this on push to main).
# Builds origin/main beside the live copy, swaps it in, health-checks, auto-rolls back.
# Run on the server:  /var/projects/brilliance/deploy.sh   (or: ci-deploy brilliance [deploy|status|rollback])
exec /usr/local/bin/ci-deploy brilliance "${1:-deploy}"
