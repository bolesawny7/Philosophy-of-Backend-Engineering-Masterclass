/**
 * ============================================================================
 * EVENT EMITTER - CENTRAL EVENT BUS
 * ============================================================================
 * 
 * ARCHITECTURE PATTERN: Observer Pattern / Event-Driven Architecture
 * 
 * WHY THIS FILE EXISTS:
 * ---------------------
 * The Event Emitter is the central nervous system of our real-time features.
 * It allows loose coupling between components - the code that creates events
 * doesn't need to know about the code that handles them.
 * 
 * DESIGN PATTERN: OBSERVER
 * ------------------------
 * 
 *   ┌─────────────────┐     emit('event')    ┌─────────────────┐
 *   │   Publisher     │ ─────────────────────>│  EventEmitter   │
 *   │  (Mutations)    │                       │  (Subject)      │
 *   └─────────────────┘                       └────────┬────────┘
 *                                                      │
 *                     ┌────────────────────────────────┼────────────────────────┐
 *                     │                                │                        │
 *                     ▼                                ▼                        ▼
 *          ┌─────────────────┐            ┌─────────────────┐       ┌─────────────────┐
 *          │  SSE Service    │            │ Webhook Service │       │  Push Service   │
 *          │  (Observer)     │            │  (Observer)     │       │  (Observer)     │
 *          └─────────────────┘            └─────────────────┘       └─────────────────┘
 * 
 * 
 * BENEFITS:
 * ---------
 * 1. Loose Coupling: Publishers don't know about subscribers
 * 2. Extensibility: Add new listeners without modifying existing code
 * 3. Testability: Easy to test publishers and subscribers independently
 * 4. Single Responsibility: Each component does one thing
 * 
 * EVENT TYPES:
 * ------------
 * - message.created: New message sent in a room
 * - user.joined: User joined a room or registered
 * - user.left: User left a room
 * - room.created: New room created
 * 
 * ============================================================================
 */

import { EventEmitter } from 'events';
import { Message, Room, User } from '../models/types';

/**
 * Strongly-typed event payload interfaces
 * TypeScript helps us ensure event data is consistent
 */
export interface MessageCreatedEvent {
    message: Message;
    room: Room;
    sender: User;
}

export interface UserJoinedEvent {
    user: User;
    room?: Room;
}

export interface UserLeftEvent {
    user: User;
    room: Room;
}

export interface RoomCreatedEvent {
    room: Room;
}

/**
 * Event name constants
 * Using constants prevents typos in event names
 */
export const EVENT_NAMES = {
    MESSAGE_CREATED: 'message.created',
    USER_JOINED: 'user.joined',
    USER_LEFT: 'user.left',
    ROOM_CREATED: 'room.created',
} as const;

/**
 * Type-safe event map
 * Maps event names to their payload types
 */
export interface ChatEventMap {
    'message.created': MessageCreatedEvent;
    'user.joined': UserJoinedEvent;
    'user.left': UserLeftEvent;
    'room.created': RoomCreatedEvent;
}

/**
 * ChatEventEmitter
 * 
 * A type-safe wrapper around Node's EventEmitter.
 * Provides better TypeScript support for our specific events.
 */
class ChatEventEmitter extends EventEmitter {
    /**
     * Type-safe emit method
     * 
     * @param event - Event name
     * @param data - Event payload (type-checked based on event name)
     */
    emit<K extends keyof ChatEventMap>(event: K, data: ChatEventMap[K]): boolean {
        console.log(`[EventEmitter] Emitting event: ${event}`);
        return super.emit(event, data);
    }

    /**
     * Type-safe listener registration
     * 
     * @param event - Event name to listen for
     * @param listener - Handler function
     */
    on<K extends keyof ChatEventMap>(
        event: K,
        listener: (data: ChatEventMap[K]) => void
    ): this {
        console.log(`[EventEmitter] Registered listener for: ${event}`);
        return super.on(event, listener);
    }

    /**
     * Type-safe one-time listener
     */
    once<K extends keyof ChatEventMap>(
        event: K,
        listener: (data: ChatEventMap[K]) => void
    ): this {
        return super.once(event, listener);
    }
}

/**
 * Singleton event emitter instance
 * 
 * All parts of the application use this single instance.
 * This ensures events emitted anywhere are received by all listeners.
 */
export const eventEmitter = new ChatEventEmitter();

// Increase max listeners to avoid warnings with many SSE connections
eventEmitter.setMaxListeners(100);

export default eventEmitter;
