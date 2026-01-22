/**
 * ============================================================================
 * REPOSITORY MODULE INDEX
 * ============================================================================
 * 
 * Central export point for all repository instances.
 * Import repositories from here to ensure you get the singleton instances.
 * 
 * ============================================================================
 */

export { userRepository } from './UserRepository';
export { messageRepository } from './MessageRepository';
export { roomRepository } from './RoomRepository';
export { webhookRepository } from './WebhookRepository';
export { pushSubscriptionRepository } from './PushSubscriptionRepository';

// Also export types for consumers that need them
export { BaseRepository, Entity } from './BaseRepository';
