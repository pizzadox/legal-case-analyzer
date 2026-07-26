#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=256"
while true; do
  echo "[keepalive] $(date): Starting Next.js production server" >> /home/z/my-project/dev.log
  node ./node_modules/.bin/next start -p 3000 >> /home/z/my-project/dev.log 2>&1
  echo "[keepalive] $(date): Server exited, restarting in 5s..." >> /home/z/my-project/dev.log
  sleep 5
done
