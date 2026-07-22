#!/bin/bash
while true; do
  cd /home/z/my-project
  export NODE_OPTIONS="--max-old-space-size=1024"
  node ./node_modules/.bin/next dev -p 3000 --webpack
  echo "Server died, restarting in 5 seconds..."
  sleep 5
done
