#!/bin/bash
cd /home/z/my-project
while true; do
  node .next/standalone/server.js 2>&1 | tee dev.log
  echo "=== Server exited, restarting in 3s ==="
  sleep 3
done
