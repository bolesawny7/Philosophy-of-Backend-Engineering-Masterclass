import http from 'http';

const PORT = 5000;
const WEBHOOK_SECRET = 'kashier-secret-key';

// Simulate payment processing delays
const PROCESSING_TIME_MS = 3000; // 3 seconds

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Payment processing endpoint
    if (req.method === 'POST' && req.url === '/process-payment') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const { paymentId, amount, currency, webhookUrl, webhookSecret } = JSON.parse(body);

                console.log(`\n💰 [${new Date().toLocaleTimeString()}] Kashier received payment request`);
                console.log(`   Payment ID: ${paymentId}`);
                console.log(`   Amount: ${amount} ${currency}`);
                
                // Generate Kashier reference
                const kashierReference = `KASH_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
                
                console.log(`   Kashier Reference: ${kashierReference}`);
                console.log(`   🔄 Processing payment (simulating ${PROCESSING_TIME_MS}ms delay)...`);

                // Immediately respond to the merchant server
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    kashierReference,
                    message: 'Payment is being processed'
                }));

                // Simulate payment processing in background
                setTimeout(() => {
                    // Randomly determine success or failure (80% success rate)
                    const isSuccess = Math.random() < 0.8;
                    
                    console.log(`\n⚙️  [${new Date().toLocaleTimeString()}] Payment processing completed`);
                    console.log(`   Result: ${isSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);

                    // Prepare webhook payload
                    const webhookPayload = {
                        event: 'payment.completed',
                        paymentId,
                        kashierReference,
                        status: isSuccess ? 'success' : 'failed',
                        amount,
                        currency
                    };

                    if (isSuccess) {
                        webhookPayload.transactionId = `TXN_${Date.now()}`;
                        console.log(`   Transaction ID: ${webhookPayload.transactionId}`);
                    } else {
                        const failures = [
                            'Insufficient funds',
                            'Card declined',
                            'Invalid card number',
                            'Card expired',
                            'Bank timeout'
                        ];
                        webhookPayload.failureReason = failures[Math.floor(Math.random() * failures.length)];
                        console.log(`   Failure Reason: ${webhookPayload.failureReason}`);
                    }

                    // Send webhook to merchant server
                    console.log(`   📤 Sending webhook to: ${webhookUrl}`);
                    sendWebhook(webhookUrl, webhookPayload, webhookSecret);

                }, PROCESSING_TIME_MS);

            } catch (error) {
                console.log(`❌ Error processing payment request: ${error.message}`);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid request' }));
            }
        });
        return;
    }

    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

/**
 * Sends a webhook to the merchant's server
 */
function sendWebhook(webhookUrl, payload, secret) {
    const data = JSON.stringify(payload);
    const url = new URL(webhookUrl);

    const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
            'X-Kashier-Secret': secret
        }
    };

    const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log(`   ✅ Webhook delivered successfully\n`);
            } else {
                console.log(`   ❌ Webhook delivery failed (Status: ${res.statusCode})\n`);
            }
        });
    });

    req.on('error', (error) => {
        console.log(`   ❌ Failed to deliver webhook: ${error.message}\n`);
    });

    req.write(data);
    req.end();
}

server.listen(PORT, () => {
    console.log(`\n🏦 Kashier Payment Gateway Simulator`);
    console.log(`=======================================`);
    console.log(`🚀 Running on http://localhost:${PORT}`);
    console.log(`📥 Payment endpoint: POST /process-payment`);
    console.log(`⏱️  Processing simulation time: ${PROCESSING_TIME_MS}ms`);
    console.log(`\nWaiting for payment requests...\n`);
});
