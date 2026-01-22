/**
 * ============================================================================
 * WEBHOOK SERVICE
 * ============================================================================
 * 
 * COMMUNICATION PATTERN: Webhooks (HTTP Callbacks)
 * 
 * WHY WEBHOOKS:
 * -------------
 * Webhooks allow external services to receive real-time notifications about
 * events in our system without constantly polling for updates.
 * 
 * It's like giving someone your phone number instead of them calling you
 * every 5 minutes to ask "did anything happen?"
 * 
 * HOW WEBHOOKS WORK:
 * ------------------
 * 
 * 1. REGISTRATION PHASE:
 *    ┌─────────────────┐                      ┌─────────────────┐
 *    │ External Service│ ─── POST /webhooks ─>│   Our Server    │
 *    │   "Call me at   │      { url: "...",   │   "OK, I'll     │
 *    │   this URL when │        events: [...] │    remember"    │
 *    │   X happens"    │      }               │                 │
 *    └─────────────────┘                      └─────────────────┘
 * 
 * 2. EVENT PHASE:
 *    ┌─────────────────┐                      ┌─────────────────┐
 *    │   User sends    │ ─── GraphQL ────────>│   Our Server    │
 *    │   a message     │      mutation        │                 │
 *    └─────────────────┘                      └────────┬────────┘
 *                                                      │
 *                                                      │ event emitted
 *                                                      ▼
 *    ┌─────────────────┐                      ┌─────────────────┐
 *    │ External Service│ <── POST (payload) ──│ Webhook Service │
 *    │   receives      │     { event: "...",  │   "Here's       │
 *    │   notification  │       data: {...} }  │    the event"   │
 *    └─────────────────┘                      └─────────────────┘
 * 
 * 
 * WEBHOOK BEST PRACTICES:
 * -----------------------
 * 1. Retry failed deliveries (network issues happen)
 * 2. Use secrets for signature verification (prevent spoofing)
 * 3. Include event ID for idempotency (avoid duplicate processing)
 * 4. Respond quickly, process async (webhook timeouts)
 * 5. Log all webhook attempts for debugging
 * 
 * ============================================================================
 */

import { webhookRepository } from '../repositories';
import { eventEmitter, MessageCreatedEvent, UserJoinedEvent, UserLeftEvent, RoomCreatedEvent } from './EventEmitter';
import { WebhookPayload, WebhookEventType } from '../models/types';
import config from '../config';
import * as crypto from 'crypto';

/**
 * Webhook delivery result for logging/monitoring
 */
interface WebhookDeliveryResult {
    webhookId: string;
    url: string;
    success: boolean;
    statusCode?: number;
    error?: string;
    attempt: number;
}

/**
 * Webhook Service
 * 
 * Handles sending webhook notifications to registered external services.
 * Implements retry logic for failed deliveries.
 */
class WebhookService {
    constructor() {
        this.setupEventListeners();
    }

    /**
     * Register event listeners to dispatch webhooks
     * 
     * When events are emitted, this service finds all webhooks
     * subscribed to that event type and POSTs to their URLs.
     */
    private setupEventListeners(): void {
        eventEmitter.on('message.created', (data: MessageCreatedEvent) => {
            this.dispatch('message.created', {
                messageId: data.message.id,
                roomId: data.room.id,
                roomName: data.room.name,
                senderId: data.sender.id,
                senderUsername: data.sender.username,
                content: data.message.content,
                createdAt: data.message.createdAt,
            });
        });

        eventEmitter.on('user.joined', (data: UserJoinedEvent) => {
            this.dispatch('user.joined', {
                userId: data.user.id,
                username: data.user.username,
                roomId: data.room?.id,
                roomName: data.room?.name,
            });
        });

        eventEmitter.on('user.left', (data: UserLeftEvent) => {
            this.dispatch('user.left', {
                userId: data.user.id,
                username: data.user.username,
                roomId: data.room.id,
                roomName: data.room.name,
            });
        });

        eventEmitter.on('room.created', (data: RoomCreatedEvent) => {
            this.dispatch('room.created', {
                roomId: data.room.id,
                roomName: data.room.name,
                createdBy: data.room.createdBy,
            });
        });

        console.log('[Webhook] Event listeners initialized');
    }

    /**
     * Dispatch an event to all subscribed webhooks
     * 
     * @param eventType - The type of event that occurred
     * @param data - The event data to send
     */
    async dispatch(
        eventType: WebhookEventType,
        data: Record<string, unknown>
    ): Promise<void> {
        // Find all active webhooks subscribed to this event type
        const webhooks = webhookRepository.findByEventType(eventType);
        
        if (webhooks.length === 0) {
            console.log(`[Webhook] No webhooks registered for ${eventType}`);
            return;
        }

        console.log(`[Webhook] Dispatching ${eventType} to ${webhooks.length} webhook(s)`);

        // Create the payload
        const payload: WebhookPayload = {
            eventType,
            timestamp: new Date(),
            data,
        };

        // Send to all webhooks in parallel
        const results = await Promise.all(
            webhooks.map(webhook => this.sendWithRetry(
                webhook.id,
                webhook.url,
                payload,
                webhook.secret
            ))
        );

        // Log results
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        console.log(`[Webhook] Dispatch complete: ${successful} succeeded, ${failed} failed`);
    }

    /**
     * Send webhook with retry logic
     * 
     * Implements exponential backoff for failed deliveries:
     * - 1st retry: wait 1 second
     * - 2nd retry: wait 2 seconds
     * - 3rd retry: wait 4 seconds
     */
    private async sendWithRetry(
        webhookId: string,
        url: string,
        payload: WebhookPayload,
        secret?: string,
        attempt: number = 1
    ): Promise<WebhookDeliveryResult> {
        try {
            const result = await this.sendWebhook(url, payload, secret);
            return {
                webhookId,
                url,
                success: result.success,
                statusCode: result.statusCode,
                attempt,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            if (attempt < config.webhook.retryAttempts) {
                // Wait before retrying (exponential backoff)
                const delay = config.webhook.retryDelay * Math.pow(2, attempt - 1);
                console.log(`[Webhook] Retry ${attempt}/${config.webhook.retryAttempts} for ${url} in ${delay}ms`);
                
                await this.sleep(delay);
                return this.sendWithRetry(webhookId, url, payload, secret, attempt + 1);
            }

            console.error(`[Webhook] Failed to deliver to ${url} after ${attempt} attempts:`, errorMessage);
            return {
                webhookId,
                url,
                success: false,
                error: errorMessage,
                attempt,
            };
        }
    }

    /**
     * Send a single webhook HTTP request
     * 
     * Uses native fetch API (available in Node 18+)
     */
    private async sendWebhook(
        url: string,
        payload: WebhookPayload,
        secret?: string
    ): Promise<{ success: boolean; statusCode: number }> {
        const body = JSON.stringify(payload);
        
        // Build headers
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'ChatApp-Webhook/1.0',
            'X-Webhook-Event': payload.eventType,
            'X-Webhook-Timestamp': payload.timestamp.toISOString(),
        };

        // Add signature if secret is configured
        if (secret) {
            const signature = this.createSignature(body, secret);
            headers['X-Webhook-Signature'] = signature;
        }

        console.log(`[Webhook] Sending to ${url}`);

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body,
            // Timeout after 10 seconds
            signal: AbortSignal.timeout(10000),
        });

        // Consider 2xx status codes as success
        const success = response.status >= 200 && response.status < 300;
        
        if (!success) {
            console.warn(`[Webhook] Non-success response from ${url}: ${response.status}`);
        }

        return { success, statusCode: response.status };
    }

    /**
     * Create HMAC signature for webhook payload
     * 
     * This allows recipients to verify the webhook came from us
     * and wasn't tampered with in transit.
     * 
     * Recipient verification:
     * 1. Compute HMAC of received body using shared secret
     * 2. Compare with X-Webhook-Signature header
     * 3. If they match, the webhook is authentic
     */
    private createSignature(body: string, secret: string): string {
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(body);
        return `sha256=${hmac.digest('hex')}`;
    }

    /**
     * Helper to sleep for a specified duration
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Singleton instance
export const webhookService = new WebhookService();

export default webhookService;
