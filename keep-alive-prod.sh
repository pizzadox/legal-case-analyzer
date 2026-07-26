#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=768"
LOG="/home/z/my-project/dev.log"
echo "[keepalive] $(date) Starting production server keeper..." >> $LOG

while true; do
  # Start the server in a new session group (immune to shell session kills)
  setsid node ./node_modules/.bin/next start -p 3000 >> $LOG 2>&1 &
  SERVER_PID=$!
  echo "[keepalive] Server PID=$SERVER_PID started" >> $LOG
  
  # Wait for server to become ready (max 30s)
  for i in $(seq 1 30); do
    if curl -s -m 2 http://localhost:3000 -o /dev/null 2>&1; then
      echo "[keepalive] Server ready at check $i" >> $LOG
      break
    fi
    sleep 1
  done
  
  # Monitor the server process - wait until it dies
  while kill -0 $SERVER_PID 2>/dev/null; do
    sleep 5
  done
  
  echo "[keepalive] Server died, restarting in 3s..." >> $LOG
  sleep 3
done
