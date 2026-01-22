# Webhook Payment Demo

A simple demonstration of how webhooks work using a payment flow with Kashier payment gateway.

## What This Demonstrates

1. Customer clicks "Pay" button
2. Your server calls Kashier API
3. Kashier processes payment asynchronously
4. Kashier sends webhook back to your server with result
5. Your server updates payment status

## How to Run

**Terminal 1** - Start Kashier simulator:
```bash
node kashier_simulator.js
```

**Terminal 2** - Start your merchant server:
```bash
node webhook_server.js
```

**Terminal 3** - Open payment page:
```bash
start payment_page.html
```

## What Are Webhooks?

Instead of your server constantly asking "Is it done yet?" (polling), webhooks let the payment provider say "I'll call you when it's done" (callback). This is how Stripe, PayPal, and other payment providers notify you of payment results.

## Files

- `payment_page.html` - Customer-facing payment form
- `webhook_server.js` - Your server (receives webhooks from Kashier)
- `kashier_simulator.js` - Simulates Kashier payment gateway
