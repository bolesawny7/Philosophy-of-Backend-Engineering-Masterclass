/**
 * ============================================================================
 * SSE ROUTES - SERVER-SENT EVENTS ENDPOINT
 * ============================================================================
 * 
 * COMMUNICATION PATTERN: Server-Sent Events (SSE)
 * 
 * WHY THIS FILE EXISTS:
 * ---------------------
 * This file defines the HTTP endpoint for SSE connections.
 * When a client connects to /events, they receive a persistent connection
 * that streams events in real-time.
 * 
 * TESTING WITH POSTMAN:
 * ---------------------
 * Postman doesn't fully support SSE, but you can test with curl:
 * 
 *   curl -N http://localhost:3000/events
 * 
 * Or in Postman, make a GET request to /events and you'll see the
 * initial connection event (though real-time updates won't work well).
 * 
 * ============================================================================
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sseService } from '../services';

const router = Router();

/**
 * GET /events
 * 
 * Establish a Server-Sent Events connection.
 * 
 * Query Parameters:
 * - userId: Filter events for a specific user (optional)
 * - roomId: Filter events for a specific room (optional)
 * 
 * The connection stays open and receives events as they occur.
 * Events are sent in the format:
 * 
 *   event: <event-type>
 *   data: <json-payload>
 * 
 * Example:
 *   event: message
 *   data: {"id":"123","content":"Hello"}
 */
router.get('/', (req: Request, res: Response) => {
    // Generate unique client ID for this connection
    const clientId = uuidv4();
    
    // Extract optional filter parameters
    const userId = req.query.userId as string | undefined;
    const roomId = req.query.roomId as string | undefined;

    console.log(`[SSE Route] New connection request from ${req.ip}`);

    /**
     * Set required headers for SSE
     * 
     * Content-Type: text/event-stream - Tells browser this is an SSE stream
     * Cache-Control: no-cache - Prevent caching of events
     * Connection: keep-alive - Keep the connection open
     * X-Accel-Buffering: no - Disable nginx buffering (if behind nginx)
     */
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    
    // Allow cross-origin requests for SSE
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Flush headers to establish the connection
    res.flushHeaders();

    // Register this client with the SSE service
    sseService.addClient(clientId, res, { userId, roomId });

    /**
     * Handle client disconnect
     * 
     * This fires when:
     * - Client closes the connection
     * - Network error occurs
     * - Browser tab is closed
     */
    req.on('close', () => {
        console.log(`[SSE Route] Client ${clientId} disconnected`);
        sseService.removeClient(clientId);
    });
});

/**
 * GET /events/status
 * 
 * Get the current status of SSE connections.
 * Useful for debugging and monitoring.
 */
router.get('/status', (_req: Request, res: Response) => {
    res.json({
        connectedClients: sseService.getClientCount(),
        timestamp: new Date().toISOString(),
    });
});

export default router;
