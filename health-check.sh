#!/bin/bash
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
  cd /home/z/my-project
  kill $(ps aux | grep "next-server" | grep -v grep | awk '{print $2}') 2>/dev/null
  kill $(ps aux | grep "next dev" | grep -v grep | awk '{print $2}') 2>/dev/null
  rm -rf .next
  setsid node node_modules/.bin/next dev -p 3000 --webpack >> /home/z/my-project/dev.log 2>&1 &
  echo "Server restarted at $(date)"
fi
