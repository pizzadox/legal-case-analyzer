#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=128"
while true; do
  echo "[keepalive] Starting Next.js production server at $(date)" >> /home/z/my-project/dev.log
  node ./node_modules/.bin/next start -p 3000 >> /home/z/my-project/dev.log 2>&1
  echo "[keepalive] Server exited at $(date), restarting in 5 seconds..." >> /home/z/my-project/dev.log
  sleep 5
done
