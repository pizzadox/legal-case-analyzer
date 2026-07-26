#!/bin/bash
# Watchdog script - keeps the server alive by restarting it when it dies
cd /home/z/my-project

LOG_FILE="/home/z/my-project/watchdog.log"
SERVER_CMD="node .next/standalone/server.js"

echo "[$(date)] Watchdog started" >> $LOG_FILE

while true; do
  # Check if server is running
  if ! curl -s -m 3 http://localhost:3000 -o /dev/null 2>&1; then
    echo "[$(date)] Server not responding, starting..." >> $LOG_FILE
    
    # Kill any existing server process on port 3000
    fuser -k 3000/tcp 2>/dev/null
    sleep 2
    
    # Start the server
    $SERVER_CMD >> /home/z/my-project/dev.log 2>&1 &
    SERVER_PID=$!
    disown
    
    # Wait for server to become ready
    for i in {1..30}; do
      if curl -s -m 3 http://localhost:3000 -o /dev/null 2>&1; then
        echo "[$(date)] Server started successfully (PID: $SERVER_PID)" >> $LOG_FILE
        break
      fi
      sleep 1
    done
    
    # Warm up the server with API calls
    for endpoint in "cases" "health-score" "brief" "bookmarks" "audit-log?limit=10" "timeline" "case-timeline" "dashboard?caseId=cms08wzy60001q3u7drmqtlw6" "documents?caseId=cms08wzy60001q3u7drmqtlw6" "persons?caseId=cms08wzy60001q3u7drmqtlw6" "episodes?caseId=cms08wzy60001q3u7drmqtlw6" "evidence-chain?caseId=cms08wzy60001q3u7drmqtlw6" "processing-status" "notifications" "compliance" "cross-ref-graph" "defense" "defense-improvements" "relationships" "risk-assessment" "sentencing" "search" "qa" "witness-statements"; do
      curl -s -m 3 "http://localhost:3000/api/case/$endpoint" -o /dev/null 2>&1
      sleep 0.3
    done
    
    echo "[$(date)] Warmup complete" >> $LOG_FILE
  fi
  
  # Check server health every 10 seconds
  sleep 10
done
