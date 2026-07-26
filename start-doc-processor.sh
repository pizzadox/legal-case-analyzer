#!/bin/bash
cd /home/z/my-project/mini-services/doc-processor
export NODE_OPTIONS="--max-old-space-size=128"
bun run dev > processor.log 2>&1 &
echo "Doc-processor started on port 3005"
