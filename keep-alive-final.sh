#!/bin/bash
# Simple keepalive for Next.js production server
# Uses low memory settings to avoid OOM
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=256"
LOG_FILE="/home/z/my-project/dev.log"

while true; do
  # Check if port 3000 is already in use by a Next.js process
  if pgrep -f "next start -p 3000" > /dev/null; then
    echo "[keepalive] $(date): Server already running, waiting..." >> $LOG_FILE
    sleep 30
    continue
  fi
  
  echo "[keepalive] $(date): Starting Next.js server" >> $LOG_FILE
  node ./node_modules/.bin/next start -p 3000 >> $LOG_FILE 2>&1
  RETRY_CODE=$?
  
  echo "[keepalive] $(date): Server exited with code $RETRY_CODE, restarting in 5s..." >> $LOG_FILE
  sleep 5
done
