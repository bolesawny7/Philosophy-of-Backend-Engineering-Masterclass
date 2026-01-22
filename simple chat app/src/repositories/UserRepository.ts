/**
 * ============================================================================
 * USER REPOSITORY
 * ============================================================================
 * 
 * ARCHITECTURE PATTERN: Repository Pattern (Specialized Implementation)
 * 
 * WHY THIS FILE EXISTS:
 * ---------------------
 * This repository extends BaseRepository to provide User-specific data access
 * methods. While basic CRUD is inherited, we add domain-specific queries here.
 * 
 * SINGLE RESPONSIBILITY:
 * ----------------------
 * This class is ONLY responsible for User data access.
 * Business logic (validation, authorization) belongs in the service layer.
 * 
 * ============================================================================
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './BaseRepository';
import { User } from '../models/types';
import config from '../config';

/**
 * UserRepository
 * 
 * Manages persistence of User entities.
 * Provides user-specific query methods beyond basic CRUD.
 */
export class UserRepository extends BaseRepository<User> {
    constructor() {
        super(config.database.usersFile, 'User');
    }

    /**
     * Find a user by their username
     * Usernames should be unique in a real system
     * 
     * @param username - The username to search for
     * @returns The user if found, undefined otherwise
     */
    findByUsername(username: string): User | undefined {
        return this.data.find(
            u => u.username.toLowerCase() === username.toLowerCase()
        );
    }

    /**
     * Find a user by email address
     * 
     * @param email - The email to search for
     * @returns The user if found, undefined otherwise
     */
    findByEmail(email: string): User | undefined {
        return this.data.find(
            u => u.email.toLowerCase() === email.toLowerCase()
        );
    }

    /**
     * Get all currently online users
     * 
     * @returns Array of users with isOnline = true
     */
    findOnlineUsers(): User[] {
        return this.findWhere(u => u.isOnline);
    }

    /**
     * Create a new user with auto-generated ID and timestamps
     * 
     * @param username - The username for the new user
     * @param email - The email for the new user
     * @returns The created user
     */
    createUser(username: string, email: string): User {
        const now = new Date();
        const user: User = {
            id: uuidv4(),
            username,
            email,
            createdAt: now,
            lastSeenAt: now,
            isOnline: true,
        };
        return this.create(user);
    }

    /**
     * Update user's online status and last seen timestamp
     * 
     * @param userId - The user ID to update
     * @param isOnline - New online status
     * @returns Updated user or undefined if not found
     */
    updateOnlineStatus(userId: string, isOnline: boolean): User | undefined {
        return this.update(userId, {
            isOnline,
            lastSeenAt: new Date(),
        });
    }
}

// Singleton instance - shared across the application
// This ensures all parts of the app share the same in-memory data
export const userRepository = new UserRepository();
