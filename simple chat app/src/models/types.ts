/**
 * ============================================================================
 * ENTITY MODELS / TYPES
 * ============================================================================
 * 
 * ARCHITECTURE PATTERN: Domain Models / Entity Layer
 * 
 * WHY THIS FILE EXISTS:
 * ---------------------
 * This file defines the core data structures (entities) of our application.
 * These types represent the fundamental business objects in our chat system.
 * 
 * DESIGN DECISIONS:
 * -----------------
 * 1. TypeScript interfaces for compile-time type safety
 * 2. Immutable-friendly design (no methods, just data)
 * 3. Clear separation between different entity types
 * 4. Timestamps for auditing and ordering
 * 
 * ENTITIES:
 * ---------
 * - User: Represents a chat participant
 * - Message: A single chat message
 * - Room: A chat room that groups users and messages
 * - WebhookSubscription: External service registration for events
 * - PushSubscription: Browser push notification subscription
 * 
 * ============================================================================
 */

/**
 * User Entity
 * 
 * Represents a participant in the chat system.
 * Users can join rooms, send messages, and receive notifications.
 */
export interface User {
    id: string;
    username: string;
    email: string;
    createdAt: Date;
    lastSeenAt: Date;
    isOnline: boolean;
}

/**
 * Message Entity
 * 
 * Represents a single message in a chat room.
 * Messages are immutable once created (no edit functionality for simplicity).
 */
export interface Message {
    id: string;
    roomId: string;
    senderId: string;
    content: string;
    createdAt: Date;
    /** Message type for future extensibility (text, image, file, etc.) */
    type: 'text' | 'system';
}

/**
 * Room Entity
 * 
 * Represents a chat room where multiple users can communicate.
 * Rooms contain messages and track their member users.
 */
export interface Room {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    createdBy: string;
    /** Array of user IDs who are members of this room */
    memberIds: string[];
}

/**
 * Webhook Subscription Entity
 * 
 * COMMUNICATION PATTERN: Webhooks (HTTP Callbacks)
 * 
 * Webhooks allow external services to receive real-time notifications
 * about events in our system. When something happens (new message, user joins),
 * we make HTTP POST requests to all registered webhook URLs.
 * 
 * This is a "push" model where our server pushes data to external services,
 * rather than them polling us for updates.
 */
export interface WebhookSubscription {
    id: string;
    /** The URL to POST event data to */
    url: string;
    /** Optional secret for signing webhook payloads (HMAC) */
    secret?: string;
    /** Which event types this webhook wants to receive */
    events: WebhookEventType[];
    createdAt: Date;
    isActive: boolean;
}

/**
 * Event types that can trigger webhook notifications
 */
export type WebhookEventType = 
    | 'message.created'
    | 'user.joined'
    | 'user.left'
    | 'room.created';

/**
 * Push Subscription Entity
 * 
 * COMMUNICATION PATTERN: Web Push Notifications
 * 
 * Push notifications allow us to send notifications to users even when
 * they're not actively using the application. The browser maintains a
 * persistent connection to a push service, and we send encrypted messages
 * through that service.
 * 
 * This subscription data is provided by the browser's Push API and must
 * be stored to send notifications later.
 */
export interface PushSubscriptionData {
    id: string;
    userId: string;
    /** Browser push subscription object */
    subscription: {
        endpoint: string;
        keys: {
            p256dh: string;
            auth: string;
        };
    };
    createdAt: Date;
}

/**
 * Webhook Payload - The data structure sent to webhook endpoints
 */
export interface WebhookPayload {
    eventType: WebhookEventType;
    timestamp: Date;
    data: Record<string, unknown>;
}
