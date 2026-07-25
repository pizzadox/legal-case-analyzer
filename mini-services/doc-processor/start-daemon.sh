#!/bin/bash
cd /home/z/my-project/mini-services/doc-processor
echo "===DOC-PROCESSOR DAEMON STARTING $(date)==="
while true; do
  sync
  echo "===STARTING DOC-PROCESSOR $(date)==="
  bun index.ts 2>&1
  echo "===DOC-PROCESSOR DIED $(date)==="
  sleep 3
done
