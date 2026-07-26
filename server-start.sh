#!/bin/bash
# Persistent server starter - survives OOM kills
while true; do
  cd /home/z/my-project
  node --max-old-space-size=768 ./node_modules/.bin/next dev --turbopack -p 3000
  echo "Server died, restarting in 3 seconds..."
  sleep 3
done
