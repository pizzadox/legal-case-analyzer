#!/bin/bash
cd /home/z/my-project
exec node --max-old-space-size=128 .next/standalone/server.js 2>&1 >> dev.log
