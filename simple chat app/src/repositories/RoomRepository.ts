/**
 * ============================================================================
 * ROOM REPOSITORY
 * ============================================================================
 * 
 * ARCHITECTURE PATTERN: Repository Pattern (Specialized Implementation)
 * 
 * WHY THIS FILE EXISTS:
 * ---------------------
 * Manages persistence of Room entities (chat channels/groups).
 * Provides queries for room membership and management.
 * 
 * ROOM CONCEPTS:
 * --------------
 * - Rooms are containers for messages and group users
 * - Users can be members of multiple rooms
 * - Rooms have creators/owners for moderation
 * 
 * ============================================================================
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './BaseRepository';
import { Room } from '../models/types';
import config from '../config';

/**
 * RoomRepository
 * 
 * Manages persistence of Room entities.
 * Handles room membership queries and management.
 */
export class RoomRepository extends BaseRepository<Room> {
    constructor() {
        super(config.database.roomsFile, 'Room');
    }

    /**
     * Find all rooms a user is a member of
     * 
     * @param userId - The user ID to find rooms for
     * @returns Array of rooms the user belongs to
     */
    findByMember(userId: string): Room[] {
        return this.findWhere(r => r.memberIds.includes(userId));
    }

    /**
     * Find rooms created by a specific user
     * 
     * @param userId - The creator's user ID
     * @returns Array of rooms created by this user
     */
    findByCreator(userId: string): Room[] {
        return this.findWhere(r => r.createdBy === userId);
    }

    /**
     * Find a room by its name
     * 
     * @param name - The room name to search for
     * @returns The room if found, undefined otherwise
     */
    findByName(name: string): Room | undefined {
        return this.data.find(
            r => r.name.toLowerCase() === name.toLowerCase()
        );
    }

    /**
     * Create a new room with auto-generated ID and timestamp
     * The creator is automatically added as a member
     * 
     * @param name - Room name
     * @param description - Room description
     * @param creatorId - User ID of the creator
     * @returns The created room
     */
    createRoom(name: string, description: string, creatorId: string): Room {
        const room: Room = {
            id: uuidv4(),
            name,
            description,
            createdAt: new Date(),
            createdBy: creatorId,
            memberIds: [creatorId], // Creator is first member
        };
        return this.create(room);
    }

    /**
     * Add a user to a room's member list
     * 
     * @param roomId - Room to add member to
     * @param userId - User to add
     * @returns Updated room or undefined if room not found
     */
    addMember(roomId: string, userId: string): Room | undefined {
        const room = this.findById(roomId);
        if (!room) return undefined;
        
        // Don't add if already a member
        if (room.memberIds.includes(userId)) {
            return room;
        }
        
        return this.update(roomId, {
            memberIds: [...room.memberIds, userId],
        });
    }

    /**
     * Remove a user from a room's member list
     * 
     * @param roomId - Room to remove member from
     * @param userId - User to remove
     * @returns Updated room or undefined if room not found
     */
    removeMember(roomId: string, userId: string): Room | undefined {
        const room = this.findById(roomId);
        if (!room) return undefined;
        
        return this.update(roomId, {
            memberIds: room.memberIds.filter(id => id !== userId),
        });
    }

    /**
     * Check if a user is a member of a room
     * 
     * @param roomId - Room to check
     * @param userId - User to check for
     * @returns True if user is a member
     */
    isMember(roomId: string, userId: string): boolean {
        const room = this.findById(roomId);
        return room ? room.memberIds.includes(userId) : false;
    }

    /**
     * Get member count for a room
     * 
     * @param roomId - Room to count members for
     * @returns Number of members, 0 if room not found
     */
    getMemberCount(roomId: string): number {
        const room = this.findById(roomId);
        return room ? room.memberIds.length : 0;
    }
}

// Singleton instance
export const roomRepository = new RoomRepository();
