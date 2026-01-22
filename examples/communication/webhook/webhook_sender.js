import http from 'http';

const WEBHOOK_URL = 'http://localhost:4000/webhook';
const WEBHOOK_SECRET = 'my-secret-key';

/**
 * Sends a webhook notification to the configured endpoint
 * @param {string} event - The event type
 * @param {object} data - The event data
 */
function sendWebhook(event, data) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({ event, data });

        const url = new URL(WEBHOOK_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'X-Webhook-Secret': WEBHOOK_SECRET
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    if (res.statusCode === 200) {
                        resolve(response);
                    } else {
                        reject(new Error(response.error || 'Webhook failed'));
                    }
                } catch (e) {
                    reject(new Error('Invalid response from webhook server'));
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// Simulate various events that trigger webhooks
async function simulateEvents() {
    console.log(' Starting webhook sender simulation...\n');

    const events = [
        {
            event: 'user.created',
            data: { userId: 'usr_123', email: 'john@example.com', name: 'John Doe' }
        },
        {
            event: 'order.completed',
            data: { orderId: 'ord_456', amount: 99.99, currency: 'USD', items: 3 }
        },
        {
            event: 'payment.received',
            data: { paymentId: 'pay_789', amount: 99.99, method: 'credit_card' }
        },
        {
            event: 'subscription.renewed',
            data: { subscriptionId: 'sub_101', plan: 'premium', nextBilling: '2026-02-22' }
        }
    ];

    for (const { event, data } of events) {
        try {
            console.log(`📤 Sending webhook: ${event}`);
            const response = await sendWebhook(event, data);
            console.log(`   ✅ Success: ${response.message} (ID: ${response.id})\n`);
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}\n`);
        }

        // Wait 1 second between webhooks
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Simulation complete!');
}

simulateEvents();
