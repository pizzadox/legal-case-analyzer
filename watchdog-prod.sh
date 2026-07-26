#!/bin/bash
# Persistent watchdog for Next.js production server
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=768"
LOG_FILE="/home/z/my-project/dev.log"

echo "[watchdog] Starting persistent server monitor..." >> $LOG_FILE

while true; do
  # Kill any existing server process on port 3000
  fuser -k 3000/tcp 2>/dev/null
  sleep 2
  
  # Start the server
  node ./node_modules/.bin/next start -p 3000 >> $LOG_FILE 2>&1
  SERVER_PID=$!
  
  echo "[watchdog] Server started with PID=$SERVER_PID, waiting for it to become ready..." >> $LOG_FILE
  
  # Wait for server to become ready
  for i in {1..60}; do
    if curl -s -m 3 http://localhost:3000 -o /dev/null 2>&1; then
      echo "[watchdog] Server ready (PID: $SERVER_PID)" >> $LOG_FILE
      break
    fi
    sleep 1
  done
  
  # Wait for the server process to die
  wait $SERVER_PID 2>/dev/null
  echo "[watchdog] Server died (PID: $SERVER_PID), restarting in 5 seconds..." >> $LOG_FILE
  sleep 5
done
