/**
 * ============================================================================
 * WEBHOOK REPOSITORY
 * ============================================================================
 * 
 * ARCHITECTURE PATTERN: Repository Pattern for Webhooks
 * 
 * COMMUNICATION PATTERN: Webhooks (HTTP Callbacks)
 * 
 * WHY THIS FILE EXISTS:
 * ---------------------
 * Webhooks are a powerful pattern for real-time notifications between services.
 * This repository manages the registered webhook endpoints that want to receive
 * notifications when events occur in our system.
 * 
 * HOW WEBHOOKS WORK:
 * ------------------
 * 
 * 1. External Service                    Our Chat App
 *    ┌─────────────┐                    ┌─────────────┐
 *    │             │ ───── Register ──> │             │
 *    │  Webhook    │     (POST /api/    │   Webhook   │
 *    │  Consumer   │      webhooks)     │  Registry   │
 *    │             │                    │             │
 *    └─────────────┘                    └─────────────┘
 * 
 * 2. When an event occurs:
 *    ┌─────────────┐                    ┌─────────────┐
 *    │   Chat      │ ───── Event ────> │   Event     │
 *    │   Action    │    (new message)  │   Emitter   │
 *    └─────────────┘                    └─────────────┘
 *                                              │
 *                                              ▼
 *    ┌─────────────┐                    ┌─────────────┐
 *    │  External   │ <── POST payload ──│   Webhook   │
 *    │  Service    │    to registered   │  Dispatcher │
 *    │             │       URLs         │             │
 *    └─────────────┘                    └─────────────┘
 * 
 * ============================================================================
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './BaseRepository';
import { WebhookSubscription, WebhookEventType } from '../models/types';
import config from '../config';

/**
 * WebhookRepository
 * 
 * Manages webhook subscriptions - external services that want to be
 * notified when events occur in our system.
 */
export class WebhookRepository extends BaseRepository<WebhookSubscription> {
    constructor() {
        super(config.database.webhooksFile, 'Webhook');
    }

    /**
     * Find all active webhooks subscribed to a specific event type
     * Used when dispatching events to determine which endpoints to call
     * 
     * @param eventType - The event type to find subscribers for
     * @returns Array of active webhook subscriptions
     */
    findByEventType(eventType: WebhookEventType): WebhookSubscription[] {
        return this.findWhere(
            w => w.isActive && w.events.includes(eventType)
        );
    }

    /**
     * Find all active webhooks
     * 
     * @returns Array of active webhook subscriptions
     */
    findActive(): WebhookSubscription[] {
        return this.findWhere(w => w.isActive);
    }

    /**
     * Find a webhook by its URL
     * Prevents duplicate registrations
     * 
     * @param url - The webhook URL to search for
     * @returns The webhook if found, undefined otherwise
     */
    findByUrl(url: string): WebhookSubscription | undefined {
        return this.data.find(w => w.url === url);
    }

    /**
     * Register a new webhook subscription
     * 
     * @param url - URL to POST event payloads to
     * @param events - Array of event types to subscribe to
     * @param secret - Optional secret for payload signing
     * @returns The created webhook subscription
     */
    createWebhook(
        url: string,
        events: WebhookEventType[],
        secret?: string
    ): WebhookSubscription {
        // Check for duplicate URL
        const existing = this.findByUrl(url);
        if (existing) {
            throw new Error(`Webhook already registered for URL: ${url}`);
        }

        const webhook: WebhookSubscription = {
            id: uuidv4(),
            url,
            events,
            secret,
            createdAt: new Date(),
            isActive: true,
        };
        return this.create(webhook);
    }

    /**
     * Activate or deactivate a webhook
     * 
     * @param id - Webhook ID
     * @param isActive - New active status
     * @returns Updated webhook or undefined
     */
    setActive(id: string, isActive: boolean): WebhookSubscription | undefined {
        return this.update(id, { isActive });
    }

    /**
     * Update the events a webhook is subscribed to
     * 
     * @param id - Webhook ID
     * @param events - New array of event types
     * @returns Updated webhook or undefined
     */
    updateEvents(id: string, events: WebhookEventType[]): WebhookSubscription | undefined {
        return this.update(id, { events });
    }
}

// Singleton instance
export const webhookRepository = new WebhookRepository();
