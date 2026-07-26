#!/bin/bash
cd /home/z/my-project
echo "===STARTING $(date)===" > /home/z/my-project/dev.log
while true; do
  node .next/standalone/server.js >> /home/z/my-project/dev.log 2>&1
  echo "===DIED-RESTARTING $(date)===" >> /home/z/my-project/dev.log
  sleep 3
done
