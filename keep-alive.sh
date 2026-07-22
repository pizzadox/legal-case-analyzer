#!/bin/bash
while true; do
  cd /home/z/my-project
  rm -rf .next 2>/dev/null
  node ./node_modules/.bin/next dev -p 3000 --webpack 2>&1
  echo "===RESTARTING==="
  sleep 3
done
