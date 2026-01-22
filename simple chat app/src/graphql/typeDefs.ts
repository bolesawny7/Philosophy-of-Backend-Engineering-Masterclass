/**
 * ============================================================================
 * GRAPHQL TYPE DEFINITIONS (SCHEMA)
 * ============================================================================
 * 
 * COMMUNICATION PATTERN: GraphQL
 * 
 * WHY GRAPHQL:
 * ------------
 * GraphQL is a query language for APIs that gives clients exactly what they
 * request - nothing more, nothing less. Unlike REST:
 * 
 * 1. Single endpoint for all operations
 * 2. Client specifies exact data shape needed
 * 3. Strong typing with introspection
 * 4. Reduces over-fetching and under-fetching
 * 
 * GRAPHQL vs REST COMPARISON:
 * ---------------------------
 * 
 * REST (Multiple endpoints, fixed responses):
 *   GET /users/123           → Full user object
 *   GET /users/123/messages  → All messages (separate request)
 *   
 * GraphQL (Single endpoint, flexible responses):
 *   query {
 *     user(id: "123") {
 *       username          ← Only get what you need
 *       messages { content } ← Include related data in one request
 *     }
 *   }
 * 
 * SCHEMA DESIGN:
 * --------------
 * - Types: Define the shape of data (User, Message, Room)
 * - Queries: Read operations (getUsers, getMessages, etc.)
 * - Mutations: Write operations (createUser, sendMessage, etc.)
 * 
 * ============================================================================
 */

import { gql } from 'apollo-server-express';

/**
 * GraphQL Schema Definition Language (SDL)
 * 
 * This defines:
 * 1. What types exist in our API
 * 2. What queries (reads) are available
 * 3. What mutations (writes) are available
 * 4. How types relate to each other
 */
export const typeDefs = gql`
    """
    ISO 8601 date-time string (e.g., "2024-01-15T10:30:00Z")
    GraphQL doesn't have a built-in DateTime type, so we use a scalar
    """
    scalar DateTime

    """
    User represents a chat participant
    Users can join rooms, send messages, and receive notifications
    """
    type User {
        id: ID!
        username: String!
        email: String!
        createdAt: DateTime!
        lastSeenAt: DateTime!
        isOnline: Boolean!
        "Rooms this user is a member of"
        rooms: [Room!]!
        "Messages sent by this user"
        messages: [Message!]!
    }

    """
    Message represents a single chat message
    Messages belong to a room and have a sender
    """
    type Message {
        id: ID!
        content: String!
        type: MessageType!
        createdAt: DateTime!
        "The room this message was sent in"
        room: Room!
        "The user who sent this message"
        sender: User!
    }

    """
    MessageType distinguishes between user messages and system notifications
    """
    enum MessageType {
        text
        system
    }

    """
    Room is a chat channel where users can communicate
    Rooms contain messages and have members
    """
    type Room {
        id: ID!
        name: String!
        description: String!
        createdAt: DateTime!
        "The user who created this room"
        createdBy: User!
        "All members of this room"
        members: [User!]!
        "All messages in this room"
        messages: [Message!]!
        "Number of members in this room"
        memberCount: Int!
        "The most recent message in this room"
        latestMessage: Message
    }

    """
    Webhook subscription for receiving event notifications
    """
    type WebhookSubscription {
        id: ID!
        url: String!
        events: [String!]!
        isActive: Boolean!
        createdAt: DateTime!
    }

    # =========================================================================
    # QUERIES - Read operations
    # =========================================================================
    
    """
    Root Query type - all read operations start here
    """
    type Query {
        "Get a user by ID"
        user(id: ID!): User
        
        "Get all users"
        users: [User!]!
        
        "Get all currently online users"
        onlineUsers: [User!]!
        
        "Get a room by ID"
        room(id: ID!): Room
        
        "Get all rooms"
        rooms: [Room!]!
        
        "Get rooms a user is a member of"
        userRooms(userId: ID!): [Room!]!
        
        "Get messages in a room (optionally with pagination)"
        messages(roomId: ID!, limit: Int, before: DateTime): [Message!]!
        
        "Get all registered webhooks"
        webhooks: [WebhookSubscription!]!
    }

    # =========================================================================
    # MUTATIONS - Write operations
    # =========================================================================
    
    """
    Root Mutation type - all write operations start here
    """
    type Mutation {
        "Create a new user"
        createUser(username: String!, email: String!): User!
        
        "Update user's online status"
        updateUserStatus(userId: ID!, isOnline: Boolean!): User
        
        "Create a new chat room"
        createRoom(name: String!, description: String!, creatorId: ID!): Room!
        
        "Join a room"
        joinRoom(roomId: ID!, userId: ID!): Room
        
        "Leave a room"
        leaveRoom(roomId: ID!, userId: ID!): Room
        
        """
        Send a message to a room
        This is the main action that triggers:
        - SSE events to connected clients
        - Webhook notifications to registered services
        - Push notifications to subscribed browsers
        """
        sendMessage(roomId: ID!, senderId: ID!, content: String!): Message!
        
        "Register a new webhook endpoint"
        registerWebhook(url: String!, events: [String!]!): WebhookSubscription!
        
        "Unregister a webhook"
        deleteWebhook(id: ID!): Boolean!
        
        "Register for push notifications"
        registerPushSubscription(
            userId: ID!
            endpoint: String!
            p256dh: String!
            auth: String!
        ): Boolean!
    }
`;

export default typeDefs;
