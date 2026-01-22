/**
 * ============================================================================
 * PUSH SUBSCRIPTION REPOSITORY
 * ============================================================================
 * 
 * ARCHITECTURE PATTERN: Repository Pattern for Push Subscriptions
 * 
 * COMMUNICATION PATTERN: Web Push Notifications
 * 
 * WHY THIS FILE EXISTS:
 * ---------------------
 * Web Push allows us to send notifications to users' browsers even when
 * they're not actively viewing our application. This repository stores
 * the subscription data needed to send those notifications.
 * 
 * HOW WEB PUSH WORKS:
 * -------------------
 * 
 * 1. User subscribes via browser Push API:
 *    ┌─────────────┐     Subscribe      ┌─────────────┐
 *    │   Browser   │ ────────────────> │  Push       │
 *    │  (Client)   │ <──────────────── │  Service    │
 *    │             │    Subscription   │  (Google,   │
 *    └─────────────┘       Data        │  Mozilla)   │
 *          │                           └─────────────┘
 *          │ Send subscription
 *          ▼ to our server
 *    ┌─────────────┐
 *    │  Our Server │ ← Stores subscription
 *    └─────────────┘
 * 
 * 2. When we want to send a notification:
 *    ┌─────────────┐                    ┌─────────────┐
 *    │  Our Server │ ─── Push Msg ────> │  Push       │
 *    │  (uses VAPID│    (encrypted)     │  Service    │
 *    │   keys)     │                    │             │
 *    └─────────────┘                    └─────────────┘
 *                                              │
 *                                              ▼
 *                                       ┌─────────────┐
 *                                       │   Browser   │
 *                                       │   Shows     │
 *                                       │   Notif.    │
 *                                       └─────────────┘
 * 
 * KEY CONCEPTS:
 * -------------
 * - VAPID: Voluntary Application Server Identification
 * - Endpoint: Unique URL for each subscription (to push service)
 * - p256dh: Public key for encryption
 * - auth: Authentication secret
 * 
 * ============================================================================
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './BaseRepository';
import { PushSubscriptionData } from '../models/types';
import config from '../config';

/**
 * PushSubscriptionRepository
 * 
 * Manages browser push notification subscriptions.
 * Each subscription is tied to a specific user and browser.
 */
export class PushSubscriptionRepository extends BaseRepository<PushSubscriptionData> {
    constructor() {
        super(config.database.subscriptionsFile, 'PushSubscription');
    }

    /**
     * Find all subscriptions for a user
     * A user can have multiple subscriptions (multiple browsers/devices)
     * 
     * @param userId - The user ID to find subscriptions for
     * @returns Array of push subscriptions
     */
    findByUser(userId: string): PushSubscriptionData[] {
        return this.findWhere(s => s.userId === userId);
    }

    /**
     * Find subscription by endpoint
     * Endpoints are unique per browser/device
     * 
     * @param endpoint - The push service endpoint URL
     * @returns The subscription if found, undefined otherwise
     */
    findByEndpoint(endpoint: string): PushSubscriptionData | undefined {
        return this.data.find(s => s.subscription.endpoint === endpoint);
    }

    /**
     * Create a new push subscription
     * 
     * @param userId - User this subscription belongs to
     * @param subscription - Browser's push subscription object
     * @returns The created subscription
     */
    createSubscription(
        userId: string,
        subscription: PushSubscriptionData['subscription']
    ): PushSubscriptionData {
        // Check if this endpoint already exists
        const existing = this.findByEndpoint(subscription.endpoint);
        if (existing) {
            // Update existing subscription (user may have logged in again)
            return this.update(existing.id, { userId, subscription }) as PushSubscriptionData;
        }

        const sub: PushSubscriptionData = {
            id: uuidv4(),
            userId,
            subscription,
            createdAt: new Date(),
        };
        return this.create(sub);
    }

    /**
     * Remove subscription by endpoint
     * Called when push service returns 410 (subscription expired/invalid)
     * 
     * @param endpoint - The endpoint to remove
     * @returns True if removed, false if not found
     */
    deleteByEndpoint(endpoint: string): boolean {
        const sub = this.findByEndpoint(endpoint);
        if (sub) {
            return this.delete(sub.id);
        }
        return false;
    }

    /**
     * Remove all subscriptions for a user
     * Called when user logs out or deletes account
     * 
     * @param userId - User to remove subscriptions for
     * @returns Number of subscriptions removed
     */
    deleteByUser(userId: string): number {
        const toDelete = this.findByUser(userId);
        toDelete.forEach(s => this.delete(s.id));
        return toDelete.length;
    }
}

// Singleton instance
export const pushSubscriptionRepository = new PushSubscriptionRepository();
