#!/bin/bash
while true; do
  cd /home/z/my-project
  node ./node_modules/.bin/next dev -p 3000 --turbopack 2>&1 | tee nextdev.log
  echo "===RESTARTING==="
  sleep 2
done
