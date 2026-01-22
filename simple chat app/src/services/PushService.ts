/**
 * ============================================================================
 * PUSH NOTIFICATION SERVICE
 * ============================================================================
 * 
 * COMMUNICATION PATTERN: Web Push API
 * 
 * WHY PUSH NOTIFICATIONS:
 * -----------------------
 * Push notifications allow us to reach users even when they're not actively
 * using our application. Unlike SSE or WebSockets, push works even when:
 * - The browser tab is closed
 * - The browser is in the background
 * - The device is locked (mobile)
 * 
 * HOW WEB PUSH WORKS:
 * -------------------
 * 
 * The Web Push architecture involves three parties:
 * 
 *   ┌──────────────────────────────────────────────────────────────────────┐
 *   │                                                                       │
 *   │    ┌─────────────┐     1. Subscribe      ┌─────────────────────────┐ │
 *   │    │   Browser   │ ─────────────────────>│    Push Service         │ │
 *   │    │  (Client)   │<─────────────────────│  (Google FCM, Mozilla,  │ │
 *   │    │             │  subscription object │   Apple APNs)           │ │
 *   │    └──────┬──────┘                       └───────────┬─────────────┘ │
 *   │           │                                          │               │
 *   │           │ 2. Send subscription                     │               │
 *   │           │    to our server                         │               │
 *   │           │                                          │               │
 *   │           ▼                                          │               │
 *   │    ┌─────────────┐     3. Push message               │               │
 *   │    │ Our Server  │ ──────────────────────────────────┘               │
 *   │    │             │     (encrypted with VAPID keys)                   │
 *   │    └─────────────┘                                                   │
 *   │           │                                                          │
 *   │           │                         4. Push service delivers         │
 *   │           │                            to browser                    │
 *   │           └──────────────────────────────────────────────────────────┤
 *   │                                                                       │
 *   └──────────────────────────────────────────────────────────────────────┘
 * 
 * KEY COMPONENTS:
 * ---------------
 * 1. VAPID Keys: Identify our server to push services
 * 2. Subscription: Browser's unique endpoint for receiving pushes
 * 3. Encryption: All push messages are encrypted end-to-end
 * 
 * ============================================================================
 */

import webPush, { PushSubscription, SendResult } from 'web-push';
import { pushSubscriptionRepository } from '../repositories';
import { eventEmitter, MessageCreatedEvent } from './EventEmitter';
import config from '../config';

/**
 * Push notification payload structure
 */
interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, unknown>;
}

/**
 * Push Notification Service
 * 
 * Handles sending push notifications to subscribed browsers.
 * Uses the Web Push protocol via the web-push library.
 */
class PushService {
    constructor() {
        this.configureVapid();
        this.setupEventListeners();
    }

    /**
     * Configure VAPID keys for push service authentication
     * 
     * VAPID (Voluntary Application Server Identification) allows:
     * - Push services to identify our application
     * - No need for FCM/APNs credentials
     * - Works with any push service that supports Web Push
     */
    private configureVapid(): void {
        webPush.setVapidDetails(
            config.push.vapidSubject,
            config.push.vapidPublicKey,
            config.push.vapidPrivateKey
        );
        console.log('[Push] VAPID configured');
        console.log(`[Push] Public key: ${config.push.vapidPublicKey.substring(0, 20)}...`);
    }

    /**
     * Register event listeners to send push notifications
     */
    private setupEventListeners(): void {
        // Send push notification when a new message is created
        eventEmitter.on('message.created', async (data: MessageCreatedEvent) => {
            await this.notifyRoomMembers(data);
        });

        console.log('[Push] Event listeners initialized');
    }

    /**
     * Notify all members of a room about a new message
     * (except the sender)
     */
    private async notifyRoomMembers(data: MessageCreatedEvent): Promise<void> {
        const { message, room, sender } = data;

        // Get all member IDs except the sender
        const memberIds = room.memberIds.filter(id => id !== sender.id);

        if (memberIds.length === 0) {
            return; // No one to notify
        }

        // Create notification payload
        const payload: PushPayload = {
            title: `New message in ${room.name}`,
            body: `${sender.username}: ${message.content.substring(0, 100)}`,
            tag: `room-${room.id}`, // Group notifications from same room
            data: {
                roomId: room.id,
                messageId: message.id,
            },
        };

        // Send to all members' subscriptions
        let sentCount = 0;
        for (const memberId of memberIds) {
            const subscriptions = pushSubscriptionRepository.findByUser(memberId);
            
            for (const sub of subscriptions) {
                const success = await this.sendPush(sub.subscription, payload);
                if (success) sentCount++;
            }
        }

        console.log(`[Push] Sent ${sentCount} push notifications for message in ${room.name}`);
    }

    /**
     * Send a push notification to a specific subscription
     * 
     * @param subscription - The browser's push subscription object
     * @param payload - The notification content
     * @returns True if sent successfully
     */
    async sendPush(subscription: PushSubscription, payload: PushPayload): Promise<boolean> {
        try {
            const result: SendResult = await webPush.sendNotification(
                subscription,
                JSON.stringify(payload),
                {
                    TTL: 60 * 60 * 24, // Time-to-live: 24 hours
                    urgency: 'normal',
                }
            );

            console.log(`[Push] Notification sent successfully (status: ${result.statusCode})`);
            return true;
        } catch (error: unknown) {
            // Handle specific error cases
            if (error && typeof error === 'object' && 'statusCode' in error) {
                const statusCode = (error as { statusCode: number }).statusCode;
                if (statusCode === 410 || statusCode === 404) {
                    // Subscription expired or invalid - remove it
                    console.log('[Push] Subscription expired, removing...');
                    pushSubscriptionRepository.deleteByEndpoint(subscription.endpoint);
                }
            }
            
            console.error('[Push] Failed to send notification:', error);
            return false;
        }
    }

    /**
     * Send a push notification to a specific user
     * Sends to all of the user's registered devices
     * 
     * @param userId - The user to notify
     * @param payload - The notification content
     */
    async notifyUser(userId: string, payload: PushPayload): Promise<void> {
        const subscriptions = pushSubscriptionRepository.findByUser(userId);
        
        if (subscriptions.length === 0) {
            console.log(`[Push] No subscriptions found for user ${userId}`);
            return;
        }

        const results = await Promise.all(
            subscriptions.map(sub => this.sendPush(sub.subscription, payload))
        );

        const successCount = results.filter(r => r).length;
        console.log(`[Push] Sent ${successCount}/${subscriptions.length} notifications to user ${userId}`);
    }

    /**
     * Broadcast a push notification to all subscribed users
     * Use sparingly - for important system-wide announcements only
     */
    async broadcast(payload: PushPayload): Promise<void> {
        const allSubscriptions = pushSubscriptionRepository.findAll();
        
        if (allSubscriptions.length === 0) {
            console.log('[Push] No subscriptions registered');
            return;
        }

        console.log(`[Push] Broadcasting to ${allSubscriptions.length} subscriptions...`);

        const results = await Promise.all(
            allSubscriptions.map(sub => this.sendPush(sub.subscription, payload))
        );

        const successCount = results.filter(r => r).length;
        console.log(`[Push] Broadcast complete: ${successCount}/${allSubscriptions.length} delivered`);
    }

    /**
     * Get the public VAPID key
     * Clients need this to subscribe to push notifications
     */
    getPublicKey(): string {
        return config.push.vapidPublicKey;
    }
}

// Singleton instance
export const pushService = new PushService();

export default pushService;
