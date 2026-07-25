#!/bin/bash
# Keep-alive script for doc-processor microservice
# This script keeps the service running by restarting it if it dies
cd /home/z/my-project/mini-services/doc-processor
while true; do
  sync
  echo "===DOC-PROCESSOR STARTING $(date)===" >> service.log
  bun index.ts 2>&1 | tee -a service.log
  echo "===DOC-PROCESSOR DIED $(date)===" >> service.log
  sleep 3
done
