import http from 'http';

const PORT = 4000;
const KASHIER_API_URL = 'http://localhost:5000';

// Store payments in memory (in production, use a database)
const payments = new Map();

// Helper function to call Kashier API
function callKashier(endpoint, data) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(data);
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: endpoint,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error('Invalid response from Kashier'));
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Kashier-Secret');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Endpoint to get all payments
    if (req.method === 'GET' && req.url === '/payments') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(Array.from(payments.values()), null, 2));
        return;
    }

    // Endpoint to get specific payment status
    if (req.method === 'GET' && req.url.startsWith('/payment/')) {
        const paymentId = req.url.split('/')[2];
        const payment = payments.get(paymentId);
        
        if (payment) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(payment));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Payment not found' }));
        }
        return;
    }

    // Endpoint to initiate payment
    if (req.method === 'POST' && req.url === '/create-payment') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const { amount, currency, customerEmail } = JSON.parse(body);
                
                // Generate unique payment ID
                const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                // Create payment record
                const payment = {
                    id: paymentId,
                    amount,
                    currency,
                    customerEmail,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                };
                
                payments.set(paymentId, payment);
                console.log(`\n💳 [${new Date().toLocaleTimeString()}] Payment created: ${paymentId}`);
                console.log(`   Amount: ${amount} ${currency}`);
                console.log(`   Customer: ${customerEmail}`);
                console.log(`   Status: pending`);

                // Call Kashier to process payment
                console.log(`📤 Calling Kashier API to process payment...`);
                
                try {
                    const kashierResponse = await callKashier('/process-payment', {
                        paymentId,
                        amount,
                        currency,
                        webhookUrl: `http://localhost:${PORT}/webhook`,
                        webhookSecret: 'kashier-secret-key'
                    });

                    console.log(`✅ Kashier accepted payment request`);
                    console.log(`   Kashier Ref: ${kashierResponse.kashierReference}`);
                    console.log(`   ⏳ Waiting for webhook callback from Kashier...\n`);

                    // Return payment ID to client
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true,
                        paymentId,
                        status: 'processing',
                        message: 'Payment is being processed by Kashier'
                    }));

                } catch (error) {
                    console.log(`❌ Failed to contact Kashier: ${error.message}`);
                    payment.status = 'failed';
                    payment.error = 'Payment provider unavailable';
                    
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        error: 'Payment provider unavailable. Please try again later.' 
                    }));
                }

            } catch (error) {
                console.log(`❌ Error creating payment: ${error.message}`);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid request' }));
            }
        });
        return;
    }

    // Webhook receiver endpoint (receives callbacks from Kashier)
    if (req.method === 'POST' && req.url === '/webhook') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const webhookSecret = req.headers['x-kashier-secret'];

                // Verify webhook secret from Kashier
                if (webhookSecret !== 'kashier-secret-key') {
                    console.log('❌ Webhook rejected: Invalid secret from Kashier');
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid webhook secret' }));
                    return;
                }

                console.log(`\n🔔 [${new Date().toLocaleTimeString()}] Webhook received from Kashier!`);
                console.log(`   Event: ${payload.event}`);
                console.log(`   Payment ID: ${payload.paymentId}`);

                // Update payment status
                const payment = payments.get(payload.paymentId);
                if (payment) {
                    payment.status = payload.status;
                    payment.kashierReference = payload.kashierReference;
                    payment.processedAt = new Date().toISOString();
                    
                    if (payload.status === 'success') {
                        payment.transactionId = payload.transactionId;
                        console.log(`   ✅ Payment SUCCESS!`);
                        console.log(`   Transaction ID: ${payload.transactionId}`);
                    } else {
                        payment.failureReason = payload.failureReason;
                        console.log(`   ❌ Payment FAILED: ${payload.failureReason}`);
                    }

                    payments.set(payload.paymentId, payment);
                    console.log(`   Updated payment status in database\n`);
                } else {
                    console.log(`   ⚠️  Warning: Payment ${payload.paymentId} not found in database\n`);
                }

                // Acknowledge webhook receipt
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: 'Webhook processed successfully'
                }));

            } catch (error) {
                console.log(`❌ Error processing webhook: ${error.message}`);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid webhook payload' }));
            }
        });
        return;
    }

    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
    console.log(`Webhook server listening on http://localhost:${PORT}`);
    console.log(`Webhook endpoint: POST http://localhost:${PORT}/webhook`);
    console.log(`View webhooks: GET http://localhost:${PORT}/webhooks`);
    console.log('\nWaiting for incoming webhooks...\n');
});
