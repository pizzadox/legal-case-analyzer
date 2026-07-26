#!/bin/bash
trap 'echo "[server] Got signal $signal" >> /home/z/my-project/dev.log' SIGTERM SIGINT SIGHUP
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=768"
echo "[server] Starting Next.js at $(date)" >> /home/z/my-project/dev.log
exec node ./node_modules/.bin/next start -p 3000 >> /home/z/my-project/dev.log 2>&1
