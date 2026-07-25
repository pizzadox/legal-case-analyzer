#!/bin/bash

# Start doc-processor microservice keep-alive in background
echo "===STARTING DOC-PROCESSOR KEEP-ALIVE $(date)==="
setsid bash /home/z/my-project/mini-services/doc-processor/keep-alive.sh >> /home/z/my-project/mini-services/doc-processor/service.log 2>&1 &
disown
echo "===DOC-PROCESSOR keep-alive started $(date)==="

# Start main Next.js server
while true; do
  cd /home/z/my-project
  rm -rf .next/cache 2>/dev/null
  sync
  echo "===STARTING $(date)==="
  node ./node_modules/.bin/next dev -p 3000 --turbopack 2>&1
  echo "===DIED $(date)==="
  sleep 3
done
