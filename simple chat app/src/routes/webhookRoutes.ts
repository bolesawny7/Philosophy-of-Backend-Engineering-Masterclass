/**
 * ============================================================================
 * WEBHOOK ROUTES - WEBHOOK MANAGEMENT ENDPOINTS
 * ============================================================================
 * 
 * COMMUNICATION PATTERN: Webhooks (HTTP Callbacks)
 * 
 * WHY THIS FILE EXISTS:
 * ---------------------
 * This file provides REST endpoints for managing webhook subscriptions.
 * While GraphQL can also manage webhooks, REST endpoints are more familiar
 * for webhook registration and provide a cleaner integration experience.
 * 
 * ENDPOINTS:
 * ----------
 * POST   /webhooks          - Register a new webhook
 * GET    /webhooks          - List all webhooks
 * GET    /webhooks/:id      - Get a specific webhook
 * DELETE /webhooks/:id      - Unregister a webhook
 * POST   /webhooks/test     - Receive test webhook (for testing)
 * 
 * TESTING WITH POSTMAN:
 * ---------------------
 * 1. Register a webhook pointing to a request bin or local endpoint
 * 2. Send a message via GraphQL
 * 3. Check your endpoint received the webhook payload
 * 
 * For testing, you can use:
 * - https://webhook.site (free webhook testing)
 * - POST to /webhooks/test on this server
 * 
 * ============================================================================
 */

import { Router, Request, Response } from 'express';
import { webhookRepository } from '../repositories';
import { WebhookEventType } from '../models/types';

const router = Router();

/**
 * POST /webhooks
 * 
 * Register a new webhook subscription.
 * 
 * Request Body:
 * {
 *   "url": "https://your-service.com/webhook",
 *   "events": ["message.created", "user.joined"],
 *   "secret": "optional-secret-for-signing" // optional
 * }
 * 
 * Response:
 * The created webhook subscription object
 */
router.post('/', (req: Request, res: Response) => {
    try {
        const { url, events, secret } = req.body;

        // Validate required fields
        if (!url) {
            res.status(400).json({ error: 'URL is required' });
            return;
        }

        if (!events || !Array.isArray(events) || events.length === 0) {
            res.status(400).json({ 
                error: 'Events array is required',
                validEvents: ['message.created', 'user.joined', 'user.left', 'room.created'],
            });
            return;
        }

        // Validate event types
        const validEvents: WebhookEventType[] = [
            'message.created', 'user.joined', 'user.left', 'room.created'
        ];
        const invalidEvents = events.filter((e: string) => !validEvents.includes(e as WebhookEventType));
        if (invalidEvents.length > 0) {
            res.status(400).json({
                error: `Invalid event types: ${invalidEvents.join(', ')}`,
                validEvents,
            });
            return;
        }

        // Create the webhook
        const webhook = webhookRepository.createWebhook(url, events, secret);
        
        console.log(`[Webhook Route] Registered new webhook: ${url}`);
        res.status(201).json(webhook);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(400).json({ error: message });
    }
});

/**
 * GET /webhooks
 * 
 * List all registered webhooks.
 * 
 * Response:
 * Array of webhook subscription objects
 */
router.get('/', (_req: Request, res: Response) => {
    const webhooks = webhookRepository.findAll();
    res.json(webhooks);
});

/**
 * GET /webhooks/:id
 * 
 * Get a specific webhook by ID.
 * 
 * Response:
 * The webhook subscription object, or 404 if not found
 */
router.get('/:id', (req: Request, res: Response) => {
    const webhook = webhookRepository.findById(req.params.id);
    
    if (!webhook) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
    }
    
    res.json(webhook);
});

/**
 * DELETE /webhooks/:id
 * 
 * Unregister a webhook.
 * 
 * Response:
 * { "success": true } or 404 if not found
 */
router.delete('/:id', (req: Request, res: Response) => {
    const deleted = webhookRepository.delete(req.params.id);
    
    if (!deleted) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
    }
    
    console.log(`[Webhook Route] Deleted webhook: ${req.params.id}`);
    res.json({ success: true });
});

/**
 * PATCH /webhooks/:id
 * 
 * Update a webhook's active status or events.
 * 
 * Request Body:
 * {
 *   "isActive": true/false,   // optional
 *   "events": ["..."]         // optional
 * }
 */
router.patch('/:id', (req: Request, res: Response) => {
    const { isActive, events } = req.body;
    const id = req.params.id;

    const webhook = webhookRepository.findById(id);
    if (!webhook) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
    }

    if (isActive !== undefined) {
        webhookRepository.setActive(id, isActive);
    }

    if (events !== undefined) {
        webhookRepository.updateEvents(id, events);
    }

    const updated = webhookRepository.findById(id);
    res.json(updated);
});

/**
 * POST /webhooks/test
 * 
 * Test endpoint that receives webhooks.
 * Use this URL when registering a webhook for testing purposes.
 * 
 * Example:
 * Register a webhook with url: "http://localhost:3000/webhooks/test"
 * Then send a message - this endpoint will log the received payload.
 */
router.post('/test', (req: Request, res: Response) => {
    console.log('[Webhook Test] Received webhook:');
    console.log('  Headers:', JSON.stringify(req.headers, null, 2));
    console.log('  Body:', JSON.stringify(req.body, null, 2));
    
    // Verify signature if present
    const signature = req.headers['x-webhook-signature'];
    if (signature) {
        console.log(`  Signature: ${signature}`);
    }
    
    // Return success
    res.status(200).json({ 
        received: true, 
        timestamp: new Date().toISOString(),
    });
});

export default router;
