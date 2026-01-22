/**
 * ============================================================================
 * SSE (SERVER-SENT EVENTS) SERVICE
 * ============================================================================
 * 
 * COMMUNICATION PATTERN: Server-Sent Events (SSE)
 * 
 * WHY SSE:
 * --------
 * SSE is a simple, efficient way to push updates from server to client.
 * Unlike WebSockets, SSE is:
 * - One-way (server → client only)
 * - Uses regular HTTP (works with proxies, load balancers)
 * - Auto-reconnects on connection loss
 * - Simpler to implement
 * 
 * Perfect for: Real-time feeds, notifications, live updates
 * 
 * HOW SSE WORKS:
 * --------------
 * 
 * 1. Client connects:
 *    GET /events
 *    Accept: text/event-stream
 * 
 * 2. Server keeps connection open and sends events:
 *    HTTP/1.1 200 OK
 *    Content-Type: text/event-stream
 *    
 *    event: message
 *    data: {"id": "123", "content": "Hello"}
 *    
 *    event: message
 *    data: {"id": "124", "content": "World"}
 *    
 *    ... (connection stays open)
 * 
 * 
 * SSE vs WEBSOCKETS vs LONG POLLING:
 * -----------------------------------
 * 
 * ┌──────────────────┬─────────────────┬─────────────────┬─────────────────┐
 * │                  │      SSE        │   WebSockets    │  Long Polling   │
 * ├──────────────────┼─────────────────┼─────────────────┼─────────────────┤
 * │ Direction        │ Server → Client │ Bidirectional   │ Server → Client │
 * │ Protocol         │ HTTP            │ WS (TCP)        │ HTTP            │
 * │ Reconnection     │ Automatic       │ Manual          │ Manual          │
 * │ Proxy Support    │ Excellent       │ May need config │ Excellent       │
 * │ Complexity       │ Low             │ Medium          │ Low             │
 * │ Use Case         │ Notifications   │ Chat, Gaming    │ Legacy support  │
 * └──────────────────┴─────────────────┴─────────────────┴─────────────────┘
 * 
 * ============================================================================
 */

import { Response } from 'express';
import { eventEmitter, MessageCreatedEvent, UserJoinedEvent, UserLeftEvent, RoomCreatedEvent } from './EventEmitter';
import config from '../config';

/**
 * Represents a connected SSE client
 */
interface SSEClient {
    id: string;
    response: Response;
    userId?: string;    // Optional: filter events for specific user
    roomId?: string;    // Optional: filter events for specific room
}

/**
 * SSE Service
 * 
 * Manages Server-Sent Events connections and broadcasts events to clients.
 * Clients can optionally filter by room or user to only receive relevant events.
 */
class SSEService {
    /** All currently connected clients */
    private clients: Map<string, SSEClient> = new Map();
    
    /** Heartbeat interval reference */
    private heartbeatInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.setupEventListeners();
        this.startHeartbeat();
    }

    /**
     * Register event listeners to forward events to SSE clients
     * 
     * This is where we bridge the Event Emitter to SSE:
     * EventEmitter → SSEService → Connected Clients
     */
    private setupEventListeners(): void {
        // Listen for new messages and broadcast to clients in that room
        eventEmitter.on('message.created', (data: MessageCreatedEvent) => {
            this.broadcast('message', data, data.room.id);
        });

        // Listen for user joins and broadcast to all clients
        eventEmitter.on('user.joined', (data: UserJoinedEvent) => {
            const roomId = data.room?.id;
            this.broadcast('user_joined', data, roomId);
        });

        // Listen for user leaves and broadcast to room clients
        eventEmitter.on('user.left', (data: UserLeftEvent) => {
            this.broadcast('user_left', data, data.room.id);
        });

        // Listen for room creation and broadcast to all clients
        eventEmitter.on('room.created', (data: RoomCreatedEvent) => {
            this.broadcast('room_created', data);
        });

        console.log('[SSE] Event listeners initialized');
    }

    /**
     * Start heartbeat to keep connections alive
     * 
     * Some proxies/browsers close connections after inactivity.
     * Sending periodic "ping" events keeps the connection alive.
     */
    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            this.clients.forEach((client) => {
                try {
                    client.response.write(': heartbeat\n\n');
                } catch (error) {
                    // Client disconnected, will be cleaned up
                    this.removeClient(client.id);
                }
            });
        }, config.sse.heartbeatInterval);

        console.log(`[SSE] Heartbeat started (interval: ${config.sse.heartbeatInterval}ms)`);
    }

    /**
     * Add a new SSE client connection
     * 
     * @param clientId - Unique identifier for this connection
     * @param response - Express response object to write events to
     * @param options - Optional filters (userId, roomId)
     */
    addClient(
        clientId: string,
        response: Response,
        options?: { userId?: string; roomId?: string }
    ): void {
        const client: SSEClient = {
            id: clientId,
            response,
            userId: options?.userId,
            roomId: options?.roomId,
        };

        this.clients.set(clientId, client);
        console.log(`[SSE] Client connected: ${clientId} (total: ${this.clients.size})`);

        // Send initial connection confirmation
        this.sendToClient(client, 'connected', {
            clientId,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Remove a client connection
     * Called when client disconnects or connection errors
     */
    removeClient(clientId: string): void {
        if (this.clients.delete(clientId)) {
            console.log(`[SSE] Client disconnected: ${clientId} (total: ${this.clients.size})`);
        }
    }

    /**
     * Send an event to a specific client
     * 
     * SSE message format:
     * event: <event-name>\n
     * data: <json-data>\n
     * \n
     */
    private sendToClient(client: SSEClient, eventType: string, data: unknown): void {
        try {
            const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
            client.response.write(message);
        } catch (error) {
            console.error(`[SSE] Error sending to client ${client.id}:`, error);
            this.removeClient(client.id);
        }
    }

    /**
     * Broadcast an event to all connected clients
     * 
     * @param eventType - The event name (e.g., 'message', 'user_joined')
     * @param data - The event payload
     * @param roomId - Optional: only send to clients subscribed to this room
     */
    broadcast(eventType: string, data: unknown, roomId?: string): void {
        let sentCount = 0;

        this.clients.forEach((client) => {
            // If roomId is specified, only send to clients subscribed to that room
            // If client has no roomId filter, they receive all events
            if (roomId && client.roomId && client.roomId !== roomId) {
                return; // Skip this client
            }

            this.sendToClient(client, eventType, data);
            sentCount++;
        });

        console.log(`[SSE] Broadcast '${eventType}' to ${sentCount} clients`);
    }

    /**
     * Get the current number of connected clients
     */
    getClientCount(): number {
        return this.clients.size;
    }

    /**
     * Cleanup resources (call on server shutdown)
     */
    shutdown(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        this.clients.clear();
        console.log('[SSE] Service shutdown');
    }
}

// Singleton instance
export const sseService = new SSEService();

export default sseService;
