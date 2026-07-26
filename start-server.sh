#!/bin/bash
cd /home/z/my-project
while true; do
  echo "=== Starting server ===" >> /home/z/my-project/server-restart.log
  date >> /home/z/my-project/server-restart.log
  node .next/standalone/server.js 2>&1 >> /home/z/my-project/server-restart.log
  echo "=== Server died, restarting ===" >> /home/z/my-project/server-restart.log
  date >> /home/z/my-project/server-restart.log
  sleep 2
done
