#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=128"
LOG="/home/z/my-project/dev.log"
while true; do
  echo "[keepalive] $(date): Starting Next.js dev server" >> $LOG
  node ./node_modules/.bin/next dev --turbopack -p 3000 >> $LOG 2>&1
  echo "[keepalive] $(date): Server died, restarting in 3s..." >> $LOG
  sleep 3
done
