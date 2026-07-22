#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=1024"
while true; do
  rm -rf .next 2>/dev/null
  node ./node_modules/.bin/next dev -p 3000 --webpack 2>&1
  echo "===SERVER RESTARTING==="
  sleep 2
done
