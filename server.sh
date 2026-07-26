#!/bin/bash
# Auto-restart server script
while true; do
  echo "Starting Next.js server..."
  cd /home/z/my-project
  node .next/standalone/server.js &
  SERVER_PID=$!
  sleep 5
  
  # Warm up API routes
  echo "Warming up..."
  for endpoint in "cases" "health-score" "brief" "bookmarks" "case-timeline" "timeline" "audit-log?limit=10" "dashboard?caseId=cms08wzy60001q3u7drmqtlw6" "documents?caseId=cms08wzy60001q3u7drmqtlw6" "persons?caseId=cms08wzy60001q3u7drmqtlw6" "episodes?caseId=cms08wzy60001q3u7drmqtlw6" "evidence-chain?caseId=cms08wzy60001q3u7drmqtlw6" "notifications" "processing-status"; do
    curl -s -m 3 http://localhost:3000/api/case/$endpoint -o /dev/null 2>&1
    sleep 0.3
  done
  echo "Warmup done"
  
  # Wait for server to die
  while kill -0 $SERVER_PID 2>/dev/null; do
    sleep 2
  done
  
  echo "Server died, restarting in 3s..."
  sleep 3
done
