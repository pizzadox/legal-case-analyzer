#!/bin/bash
# Persistent doc-processor starter
while true; do
  cd /home/z/my-project/mini-services/doc-processor
  bun --hot index.ts
  echo "Doc-processor died, restarting in 3 seconds..."
  sleep 3
done
