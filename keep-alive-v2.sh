#!/bin/bash
while true; do
  cd /home/z/my-project
  rm -rf .next/cache 2>/dev/null
  sync
  echo "===STARTING $(date)==="
  node ./node_modules/.bin/next dev -p 3000 --turbopack 2>&1
  echo "===DIED $(date)==="
  sleep 3
done
