#!/bin/bash
cd /home/z/my-project
while true; do
  rm -rf .next
  node node_modules/.bin/next dev -p 3000 --webpack
  echo "Server exited, restarting in 5 seconds..."
  sleep 5
done
