#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=768"
while true; do
  node ./node_modules/.bin/next start -p 3000 2>&1
  echo "===SERVER RESTARTING==="
  sleep 5
done
