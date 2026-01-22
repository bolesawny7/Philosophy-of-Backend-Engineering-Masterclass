/**
 * ============================================================================
 * MESSAGE REPOSITORY
 * ============================================================================
 * 
 * ARCHITECTURE PATTERN: Repository Pattern (Specialized Implementation)
 * 
 * WHY THIS FILE EXISTS:
 * ---------------------
 * Manages persistence of Message entities with specialized queries for
 * chat functionality like finding messages by room or sender.
 * 
 * CHAT-SPECIFIC QUERIES:
 * ----------------------
 * - Find messages by room (for loading chat history)
 * - Find messages by sender (for user message history)
 * - Paginated queries (for infinite scroll)
 * 
 * ============================================================================
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './BaseRepository';
import { Message } from '../models/types';
import config from '../config';

/**
 * MessageRepository
 * 
 * Manages persistence of Message entities.
 * Optimized for chat application query patterns.
 */
export class MessageRepository extends BaseRepository<Message> {
    constructor() {
        super(config.database.messagesFile, 'Message');
    }

    /**
     * Find all messages in a specific room
     * Ordered by creation time (oldest first for chat display)
     * 
     * @param roomId - The room to get messages from
     * @returns Array of messages in chronological order
     */
    findByRoom(roomId: string): Message[] {
        return this.findWhere(m => m.roomId === roomId)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    /**
     * Find messages by room with pagination
     * Used for loading chat history in chunks (infinite scroll)
     * 
     * @param roomId - The room to get messages from
     * @param limit - Maximum number of messages to return
     * @param before - Only get messages before this date (for pagination)
     * @returns Array of messages, newest first
     */
    findByRoomPaginated(roomId: string, limit: number, before?: Date): Message[] {
        let messages = this.findWhere(m => m.roomId === roomId);
        
        // Filter by date if provided
        if (before) {
            messages = messages.filter(m => m.createdAt < before);
        }
        
        // Sort newest first for pagination
        messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        // Apply limit
        return messages.slice(0, limit);
    }

    /**
     * Find all messages sent by a specific user
     * 
     * @param senderId - The user ID to find messages for
     * @returns Array of messages from this sender
     */
    findBySender(senderId: string): Message[] {
        return this.findWhere(m => m.senderId === senderId);
    }

    /**
     * Create a new message with auto-generated ID and timestamp
     * 
     * @param roomId - Room to post message in
     * @param senderId - User sending the message
     * @param content - Message content
     * @param type - Message type (text or system)
     * @returns The created message
     */
    createMessage(
        roomId: string,
        senderId: string,
        content: string,
        type: 'text' | 'system' = 'text'
    ): Message {
        const message: Message = {
            id: uuidv4(),
            roomId,
            senderId,
            content,
            type,
            createdAt: new Date(),
        };
        return this.create(message);
    }

    /**
     * Delete all messages in a room
     * Used when deleting a room
     * 
     * @param roomId - The room to clear messages from
     * @returns Number of messages deleted
     */
    deleteByRoom(roomId: string): number {
        const toDelete = this.findWhere(m => m.roomId === roomId);
        toDelete.forEach(m => this.delete(m.id));
        return toDelete.length;
    }

    /**
     * Get the latest message in a room
     * Useful for showing room previews
     * 
     * @param roomId - The room to get latest message from
     * @returns The latest message or undefined if room is empty
     */
    getLatestInRoom(roomId: string): Message | undefined {
        const messages = this.findByRoom(roomId);
        return messages[messages.length - 1];
    }
}

// Singleton instance
export const messageRepository = new MessageRepository();
