#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=768"
# Don't delete .next/cache to keep compilation fast
rm -rf .next/cache/fallback 2>/dev/null
while true; do
  echo "===STARTING $(date)==="
  node ./node_modules/.bin/next dev -p 3000 --turbopack 2>&1
  echo "===DIED $(date)==="
  sleep 5
done
