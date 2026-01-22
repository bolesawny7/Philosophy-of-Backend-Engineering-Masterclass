/**
 * ============================================================================
 * PUSH NOTIFICATION ROUTES
 * ============================================================================
 * 
 * COMMUNICATION PATTERN: Web Push Notifications
 * 
 * WHY THIS FILE EXISTS:
 * ---------------------
 * These endpoints support the Web Push API flow:
 * 1. Client gets our public VAPID key
 * 2. Client subscribes via browser's Push API
 * 3. Client sends subscription to our server
 * 4. We store it and can send push notifications later
 * 
 * CLIENT-SIDE FLOW:
 * -----------------
 * 
 * // 1. Get VAPID key from server
 * const response = await fetch('/push/vapid-public-key');
 * const { key } = await response.json();
 * 
 * // 2. Subscribe using browser Push API
 * const registration = await navigator.serviceWorker.ready;
 * const subscription = await registration.pushManager.subscribe({
 *     userVisibleOnly: true,
 *     applicationServerKey: urlBase64ToUint8Array(key)
 * });
 * 
 * // 3. Send subscription to our server
 * await fetch('/push/subscribe', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({
 *         userId: 'current-user-id',
 *         subscription: subscription
 *     })
 * });
 * 
 * ============================================================================
 */

import { Router, Request, Response } from 'express';
import { pushService } from '../services';
import { pushSubscriptionRepository } from '../repositories';

const router = Router();

/**
 * GET /push/vapid-public-key
 * 
 * Get the server's VAPID public key.
 * Clients need this to subscribe to push notifications.
 * 
 * Response:
 * {
 *   "key": "BNxR...public-key...xyz"
 * }
 */
router.get('/vapid-public-key', (_req: Request, res: Response) => {
    res.json({
        key: pushService.getPublicKey(),
    });
});

/**
 * POST /push/subscribe
 * 
 * Register a push subscription for a user.
 * 
 * Request Body:
 * {
 *   "userId": "user-id",
 *   "subscription": {
 *     "endpoint": "https://fcm.googleapis.com/...",
 *     "keys": {
 *       "p256dh": "...",
 *       "auth": "..."
 *     }
 *   }
 * }
 * 
 * The subscription object comes directly from the browser's
 * PushManager.subscribe() method.
 */
router.post('/subscribe', (req: Request, res: Response) => {
    try {
        const { userId, subscription } = req.body;

        // Validate required fields
        if (!userId) {
            res.status(400).json({ error: 'userId is required' });
            return;
        }

        if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
            res.status(400).json({ 
                error: 'Invalid subscription object',
                required: {
                    endpoint: 'Push service endpoint URL',
                    keys: {
                        p256dh: 'Public key for message encryption',
                        auth: 'Authentication secret',
                    },
                },
            });
            return;
        }

        // Store the subscription
        const sub = pushSubscriptionRepository.createSubscription(userId, {
            endpoint: subscription.endpoint,
            keys: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
            },
        });

        console.log(`[Push Route] Registered subscription for user ${userId}`);
        res.status(201).json({
            success: true,
            subscriptionId: sub.id,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(400).json({ error: message });
    }
});

/**
 * DELETE /push/unsubscribe
 * 
 * Unregister a push subscription.
 * 
 * Request Body:
 * {
 *   "endpoint": "https://fcm.googleapis.com/..."
 * }
 */
router.delete('/unsubscribe', (req: Request, res: Response) => {
    const { endpoint } = req.body;

    if (!endpoint) {
        res.status(400).json({ error: 'endpoint is required' });
        return;
    }

    const deleted = pushSubscriptionRepository.deleteByEndpoint(endpoint);
    
    if (!deleted) {
        res.status(404).json({ error: 'Subscription not found' });
        return;
    }

    console.log(`[Push Route] Unsubscribed endpoint: ${endpoint.substring(0, 50)}...`);
    res.json({ success: true });
});

/**
 * GET /push/subscriptions/:userId
 * 
 * Get all push subscriptions for a user.
 * Useful for debugging.
 */
router.get('/subscriptions/:userId', (req: Request, res: Response) => {
    const subscriptions = pushSubscriptionRepository.findByUser(req.params.userId);
    res.json(subscriptions);
});

/**
 * POST /push/test
 * 
 * Send a test push notification to a user.
 * 
 * Request Body:
 * {
 *   "userId": "user-id",
 *   "title": "Test Notification",
 *   "body": "This is a test"
 * }
 */
router.post('/test', async (req: Request, res: Response) => {
    try {
        const { userId, title, body } = req.body;

        if (!userId) {
            res.status(400).json({ error: 'userId is required' });
            return;
        }

        await pushService.notifyUser(userId, {
            title: title || 'Test Notification',
            body: body || 'This is a test push notification',
        });

        res.json({ success: true, message: 'Test notification sent' });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
});

export default router;
