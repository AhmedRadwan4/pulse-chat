import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import http from 'http'
import { Server } from 'socket.io'
import { setupSocket } from './socket'

const PORT = parseInt(process.env.PORT || '4000', 10)
const FRONTEND_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const app = express()

// Security headers
app.use(helmet())

// CORS — only allow requests from the frontend
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
)

app.use(express.json())

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() })
})

// Create HTTP server and attach Socket.IO
const httpServer = http.createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST']
  },
  // Allow long-polling fallback for environments that block WebSocket upgrades
  transports: ['websocket', 'polling'],
  // Ping/pong settings for connection health
  pingTimeout: 30_000,
  pingInterval: 25_000
})

// Register all Socket.IO event handlers and Redis adapter
setupSocket(io)

httpServer.listen(PORT, () => {
  console.log(`[Server] PulseChat Socket.IO server running on port ${PORT}`)
  console.log(`[Server] Accepting connections from: ${FRONTEND_URL}`)
  console.log(`[Server] Health check: http://localhost:${PORT}/health`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received — shutting down gracefully')
  httpServer.close(() => {
    console.log('[Server] HTTP server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received — shutting down gracefully')
  httpServer.close(() => {
    console.log('[Server] HTTP server closed')
    process.exit(0)
  })
})
