#!/bin/sh
while true; do
  cd /home/z/my-project
  node ./node_modules/.bin/next start --port 3000 >> /home/z/my-project/dev.log 2>&1
  echo "Server died, restarting in 5s..." >> /home/z/my-project/dev.log
  sleep 5
done
