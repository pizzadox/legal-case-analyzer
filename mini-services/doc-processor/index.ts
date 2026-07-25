import { createServer, IncomingMessage, ServerResponse } from 'http'
import { db } from './lib/db'
import { processDocument } from './lib/processor'

const PORT = 3005
const POLL_INTERVAL_MS = 5000 // 5 seconds

// Track currently processing documents to avoid duplicates
const currentlyProcessing = new Set<string>()

// Service state
let isRunning = true

/**
 * HTTP API handler for /api/status endpoint
 * Returns processing queue status for documents in a specific case
 */
async function handleStatusRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    // Parse query parameters from URL
    const url = new URL(req.url || '/', `http://localhost:${PORT}`)
    const caseId = url.searchParams.get('caseId')

    if (!caseId) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'caseId parameter is required' }))
      return
    }

    // Fetch processing queue entries for documents in this case
    const queueEntries = await db.processingQueue.findMany({
      where: {
        document: {
          caseId: caseId,
        },
      },
      include: {
        document: {
          select: {
            id: true,
            originalName: true,
            processingStatus: true,
            fileName: true,
          },
        },
      },
      orderBy: {
        queuePosition: 'asc',
      },
    })

    // Get total counts for progress calculation
    const totalDocs = queueEntries.length
    const completedDocs = queueEntries.filter(e => e.status === 'completed').length
    const failedDocs = queueEntries.filter(e => e.status === 'failed').length
    const processingDocs = queueEntries.filter(e => e.status === 'processing').length
    const queuedDocs = queueEntries.filter(e => e.status === 'queued').length

    const progressPercent = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0

    // Build response with detailed status for each document
    const items = queueEntries.map(entry => ({
      id: entry.id,
      documentId: entry.document.id,
      documentName: entry.document.originalName,
      queuePosition: entry.queuePosition,
      status: entry.status,
      startedAt: entry.startedAt?.toISOString() || null,
      completedAt: entry.completedAt?.toISOString() || null,
      error: entry.error || null,
      processingStatus: entry.document.processingStatus,
      isCurrentlyProcessing: currentlyProcessing.has(entry.id),
    }))

    const response = {
      caseId,
      total: totalDocs,
      completed: completedDocs,
      failed: failedDocs,
      processing: processingDocs,
      queued: queuedDocs,
      progress: progressPercent,
      items,
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(response))
  } catch (error) {
    console.error('[API] Status request error:', error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error', details: String(error) }))
  }
}

/**
 * HTTP API handler for /api/health endpoint
 * Returns service health status
 */
async function handleHealthRequest(res: ServerResponse): Promise<void> {
  try {
    // Check database connection by querying ProcessingQueue count
    await db.processingQueue.count()

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'healthy',
      port: PORT,
      currentlyProcessing: currentlyProcessing.size,
      timestamp: new Date().toISOString(),
    }))
  } catch (error) {
    res.writeHead(503, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'unhealthy',
      error: String(error),
      timestamp: new Date().toISOString(),
    }))
  }
}

/**
 * HTTP request router
 */
async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`)
  const pathname = url.pathname

  console.log(`[HTTP] ${req.method} ${pathname}`)

  if (req.method === 'GET' && pathname === '/api/status') {
    await handleStatusRequest(req, res)
  } else if (req.method === 'GET' && pathname === '/api/health') {
    await handleHealthRequest(res)
  } else if (req.method === 'POST' && pathname === '/api/process') {
    // Manual trigger to process a specific document
    const documentId = url.searchParams.get('documentId')
    if (!documentId) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'documentId parameter is required' }))
      return
    }

    // Find the queue entry for this document
    const queueEntry = await db.processingQueue.findFirst({
      where: { documentId, status: { in: ['queued', 'processing'] } },
    })

    if (!queueEntry) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'No queued/processing entry found for this document' }))
      return
    }

    // Process in background
    processDocumentAsync(queueEntry.id, queueEntry.documentId)

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      message: 'Processing started',
      queueId: queueEntry.id,
      documentId: queueEntry.documentId,
    }))
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found', availableEndpoints: ['/api/status', '/api/health', '/api/process'] }))
  }
}

/**
 * Process a document asynchronously (non-blocking)
 */
function processDocumentAsync(queueId: string, documentId: string): void {
  if (currentlyProcessing.has(queueId)) {
    console.log(`[Poller] Skipping ${queueId} - already being processed`)
    return
  }

  currentlyProcessing.add(queueId)

  processDocument(queueId, documentId)
    .then(() => {
      console.log(`[Poller] Processing completed: ${documentId}`)
    })
    .catch((error) => {
      console.error(`[Poller] Processing failed: ${documentId}`, error)
    })
    .finally(() => {
      currentlyProcessing.delete(queueId)
    })
}

/**
 * Poll the database for queued/processing documents and process them
 */
async function pollAndProcess(): Promise<void> {
  if (!isRunning) return

  // Skip polling if we're already processing a document
  if (currentlyProcessing.size > 0) {
    console.log(`[Poller] Currently processing ${currentlyProcessing.size} document(s), skipping poll`)
    return
  }

  try {
    // Find queue entries that are queued
    // Only process documents not already being handled
    const pendingEntries = await db.processingQueue.findMany({
      where: {
        status: 'queued',
      },
      include: {
        document: {
          select: {
            id: true,
            originalName: true,
            processingStatus: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { queuePosition: 'asc' },
      ],
      take: 1, // Process one at a time to avoid overloading AI services
    })

    if (pendingEntries.length === 0) {
      // Nothing to process, wait quietly
      return
    }

    const entry = pendingEntries[0]
    console.log(`[Poller] Found document to process: ${entry.document.originalName} (queueId: ${entry.id})`)

    // Process the document
    processDocumentAsync(entry.id, entry.documentId)
  } catch (error) {
    console.error('[Poller] Poll error:', error)
  }
}

/**
 * Start the polling loop
 */
function startPolling(): void {
  console.log(`[Poller] Starting polling loop (interval: ${POLL_INTERVAL_MS}ms)`)

  const poll = async () => {
    await pollAndProcess()
  }

  // Run initial poll immediately
  poll()

  // Set up interval polling
  setInterval(poll, POLL_INTERVAL_MS)
}

/**
 * Create and start the HTTP server
 */
function startServer(): void {
  const server = createServer(handleRequest)

  server.listen(PORT, () => {
    console.log(`[Server] Document Processor microservice running on port ${PORT}`)
    console.log(`[Server] Available endpoints:`)
    console.log(`[Server]   GET  /api/status?caseId=xxx - Processing queue status for a case`)
    console.log(`[Server]   GET  /api/health          - Service health check`)
    console.log(`[Server]   POST /api/process?documentId=xxx - Trigger processing for a document`)
    console.log(`[Server] Polling DB every ${POLL_INTERVAL_MS}ms for queued documents`)
  })

  // Start the polling loop
  startPolling()

  // Graceful shutdown
  const shutdown = () => {
    console.log('[Server] Shutting down...')
    isRunning = false
    server.close(() => {
      console.log('[Server] HTTP server closed')
      db.$disconnect().then(() => {
        console.log('[Server] Database connection closed')
        process.exit(0)
      }).catch(() => {
        process.exit(0)
      })
    })

    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout')
      process.exit(1)
    }, 10000)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

// Add process-level error handlers to prevent silent crashes
process.on('uncaughtException', (error) => {
  console.error('[Service] Uncaught exception:', error)
  // Don't exit - keep the service running
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Service] Unhandled promise rejection:', reason)
  // Don't exit - keep the service running
})

// Start the service
startServer()
