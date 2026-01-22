/**
 * ============================================================================
 * GRAPHQL RESOLVERS
 * ============================================================================
 * 
 * COMMUNICATION PATTERN: GraphQL (Query/Mutation Resolution)
 * 
 * WHY THIS FILE EXISTS:
 * ---------------------
 * Resolvers are the functions that actually execute GraphQL operations.
 * The type definitions (schema) describe WHAT data looks like.
 * The resolvers describe HOW to get that data.
 * 
 * RESOLVER TYPES:
 * ---------------
 * 1. Query resolvers: Handle read operations
 * 2. Mutation resolvers: Handle write operations
 * 3. Field resolvers: Resolve nested fields on types
 * 
 * RESOLVER SIGNATURE:
 * -------------------
 * resolver(parent, args, context, info)
 *   - parent: Result from parent resolver (for nested resolvers)
 *   - args: Arguments passed to the field
 *   - context: Shared context (we use this for repositories)
 *   - info: Query metadata (rarely used)
 * 
 * EVENT INTEGRATION:
 * ------------------
 * Mutations that create/update data also emit events that trigger:
 * - SSE (Server-Sent Events) for real-time updates
 * - Webhooks for external service notifications
 * - Push notifications for browser notifications
 * 
 * ============================================================================
 */

import { GraphQLScalarType, Kind } from 'graphql';
import {
    userRepository,
    messageRepository,
    roomRepository,
    webhookRepository,
    pushSubscriptionRepository,
} from '../repositories';
import { eventEmitter } from '../services/EventEmitter';
import { Message, Room, User } from '../models/types';

/**
 * Custom DateTime scalar
 * 
 * GraphQL doesn't have a built-in DateTime type, so we create one.
 * This handles serialization between JavaScript Date objects and ISO strings.
 */
const DateTimeScalar = new GraphQLScalarType({
    name: 'DateTime',
    description: 'ISO 8601 date-time string',
    
    // Serialize: JavaScript → GraphQL response (Date → String)
    serialize(value: unknown): string {
        if (value instanceof Date) {
            return value.toISOString();
        }
        throw new Error('DateTime cannot represent non-Date value');
    },
    
    // Parse value from variables (String → Date)
    parseValue(value: unknown): Date {
        if (typeof value === 'string') {
            return new Date(value);
        }
        throw new Error('DateTime must be a string');
    },
    
    // Parse literal from query string (AST → Date)
    parseLiteral(ast): Date {
        if (ast.kind === Kind.STRING) {
            return new Date(ast.value);
        }
        throw new Error('DateTime must be a string');
    },
});

/**
 * GraphQL Resolvers
 * 
 * Organized by:
 * - DateTime: Custom scalar resolver
 * - Query: Read operations
 * - Mutation: Write operations
 * - User/Message/Room: Field resolvers for nested data
 */
export const resolvers = {
    // Custom scalar type
    DateTime: DateTimeScalar,

    // ========================================================================
    // QUERY RESOLVERS - Read Operations
    // ========================================================================
    Query: {
        /**
         * Get a single user by ID
         */
        user: (_: unknown, { id }: { id: string }): User | undefined => {
            return userRepository.findById(id);
        },

        /**
         * Get all users
         */
        users: (): User[] => {
            return userRepository.findAll();
        },

        /**
         * Get all currently online users
         */
        onlineUsers: (): User[] => {
            return userRepository.findOnlineUsers();
        },

        /**
         * Get a single room by ID
         */
        room: (_: unknown, { id }: { id: string }): Room | undefined => {
            return roomRepository.findById(id);
        },

        /**
         * Get all rooms
         */
        rooms: (): Room[] => {
            return roomRepository.findAll();
        },

        /**
         * Get rooms a specific user is a member of
         */
        userRooms: (_: unknown, { userId }: { userId: string }): Room[] => {
            return roomRepository.findByMember(userId);
        },

        /**
         * Get messages in a room with optional pagination
         * 
         * @param roomId - The room to fetch messages from
         * @param limit - Maximum messages to return (default: 50)
         * @param before - Only fetch messages before this timestamp
         */
        messages: (
            _: unknown,
            { roomId, limit = 50, before }: { roomId: string; limit?: number; before?: Date }
        ): Message[] => {
            if (before) {
                return messageRepository.findByRoomPaginated(roomId, limit, before);
            }
            return messageRepository.findByRoom(roomId).slice(-limit);
        },

        /**
         * Get all registered webhooks
         */
        webhooks: () => {
            return webhookRepository.findAll();
        },
    },

    // ========================================================================
    // MUTATION RESOLVERS - Write Operations
    // ========================================================================
    Mutation: {
        /**
         * Create a new user
         */
        createUser: (
            _: unknown,
            { username, email }: { username: string; email: string }
        ): User => {
            // Check for existing username
            const existingUsername = userRepository.findByUsername(username);
            if (existingUsername) {
                throw new Error(`Username "${username}" is already taken`);
            }

            // Check for existing email
            const existingEmail = userRepository.findByEmail(email);
            if (existingEmail) {
                throw new Error(`Email "${email}" is already registered`);
            }

            const user = userRepository.createUser(username, email);
            
            // Emit event for real-time updates
            eventEmitter.emit('user.joined', { user });
            
            return user;
        },

        /**
         * Update a user's online status
         */
        updateUserStatus: (
            _: unknown,
            { userId, isOnline }: { userId: string; isOnline: boolean }
        ): User | undefined => {
            return userRepository.updateOnlineStatus(userId, isOnline);
        },

        /**
         * Create a new chat room
         */
        createRoom: (
            _: unknown,
            { name, description, creatorId }: { name: string; description: string; creatorId: string }
        ): Room => {
            // Verify creator exists
            const creator = userRepository.findById(creatorId);
            if (!creator) {
                throw new Error(`User ${creatorId} not found`);
            }

            // Check for duplicate room name
            const existingRoom = roomRepository.findByName(name);
            if (existingRoom) {
                throw new Error(`Room "${name}" already exists`);
            }

            const room = roomRepository.createRoom(name, description, creatorId);
            
            // Emit event for webhooks/SSE
            eventEmitter.emit('room.created', { room });
            
            return room;
        },

        /**
         * Add a user to a room
         */
        joinRoom: (
            _: unknown,
            { roomId, userId }: { roomId: string; userId: string }
        ): Room | undefined => {
            const user = userRepository.findById(userId);
            if (!user) {
                throw new Error(`User ${userId} not found`);
            }

            const room = roomRepository.addMember(roomId, userId);
            if (room) {
                // Create system message announcing the join
                messageRepository.createMessage(
                    roomId,
                    userId,
                    `${user.username} joined the room`,
                    'system'
                );
                
                eventEmitter.emit('user.joined', { user, room });
            }
            return room;
        },

        /**
         * Remove a user from a room
         */
        leaveRoom: (
            _: unknown,
            { roomId, userId }: { roomId: string; userId: string }
        ): Room | undefined => {
            const user = userRepository.findById(userId);
            if (!user) {
                throw new Error(`User ${userId} not found`);
            }

            const room = roomRepository.removeMember(roomId, userId);
            if (room) {
                // Create system message announcing the leave
                messageRepository.createMessage(
                    roomId,
                    userId,
                    `${user.username} left the room`,
                    'system'
                );
                
                eventEmitter.emit('user.left', { user, room });
            }
            return room;
        },

        /**
         * Send a message to a room
         * 
         * THIS IS THE KEY MUTATION that demonstrates all communication patterns:
         * 1. Returns data via GraphQL response
         * 2. Emits event that triggers SSE broadcast
         * 3. Emits event that triggers webhook calls
         * 4. Emits event that triggers push notifications
         */
        sendMessage: (
            _: unknown,
            { roomId, senderId, content }: { roomId: string; senderId: string; content: string }
        ): Message => {
            // Validate room exists
            const room = roomRepository.findById(roomId);
            if (!room) {
                throw new Error(`Room ${roomId} not found`);
            }

            // Validate sender exists and is a member
            const sender = userRepository.findById(senderId);
            if (!sender) {
                throw new Error(`User ${senderId} not found`);
            }

            if (!roomRepository.isMember(roomId, senderId)) {
                throw new Error(`User ${senderId} is not a member of room ${roomId}`);
            }

            // Create the message
            const message = messageRepository.createMessage(roomId, senderId, content, 'text');

            /**
             * EMIT EVENT
             * 
             * The 'message.created' event will be handled by:
             * 1. SSE service → Pushes to all connected clients
             * 2. Webhook service → POSTs to all registered webhooks
             * 3. Push service → Sends browser push notifications
             */
            eventEmitter.emit('message.created', {
                message,
                room,
                sender,
            });

            return message;
        },

        /**
         * Register a new webhook endpoint
         */
        registerWebhook: (
            _: unknown,
            { url, events }: { url: string; events: string[] }
        ) => {
            return webhookRepository.createWebhook(url, events as any);
        },

        /**
         * Delete a webhook registration
         */
        deleteWebhook: (_: unknown, { id }: { id: string }): boolean => {
            return webhookRepository.delete(id);
        },

        /**
         * Register a browser for push notifications
         */
        registerPushSubscription: (
            _: unknown,
            { userId, endpoint, p256dh, auth }: {
                userId: string;
                endpoint: string;
                p256dh: string;
                auth: string;
            }
        ): boolean => {
            try {
                pushSubscriptionRepository.createSubscription(userId, {
                    endpoint,
                    keys: { p256dh, auth },
                });
                return true;
            } catch (error) {
                console.error('Failed to register push subscription:', error);
                return false;
            }
        },
    },

    // ========================================================================
    // FIELD RESOLVERS - Resolve nested/related data
    // ========================================================================
    
    /**
     * User field resolvers
     * These resolve nested fields when a User is queried
     */
    User: {
        // Resolve rooms this user is a member of
        rooms: (user: User): Room[] => {
            return roomRepository.findByMember(user.id);
        },
        // Resolve messages sent by this user
        messages: (user: User): Message[] => {
            return messageRepository.findBySender(user.id);
        },
    },

    /**
     * Message field resolvers
     */
    Message: {
        // Resolve the room this message belongs to
        room: (message: Message): Room | undefined => {
            return roomRepository.findById(message.roomId);
        },
        // Resolve the sender of this message
        sender: (message: Message): User | undefined => {
            return userRepository.findById(message.senderId);
        },
    },

    /**
     * Room field resolvers
     */
    Room: {
        // Resolve the creator of this room
        createdBy: (room: Room): User | undefined => {
            return userRepository.findById(room.createdBy);
        },
        // Resolve all members of this room
        members: (room: Room): User[] => {
            return room.memberIds
                .map(id => userRepository.findById(id))
                .filter((u): u is User => u !== undefined);
        },
        // Resolve all messages in this room
        messages: (room: Room): Message[] => {
            return messageRepository.findByRoom(room.id);
        },
        // Compute member count
        memberCount: (room: Room): number => {
            return room.memberIds.length;
        },
        // Get the latest message in the room
        latestMessage: (room: Room): Message | undefined => {
            return messageRepository.getLatestInRoom(room.id);
        },
    },
};

export default resolvers;
