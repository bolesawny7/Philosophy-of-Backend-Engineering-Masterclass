/**
 * ============================================================================
 * APPLICATION CONFIGURATION
 * ============================================================================
 * 
 * ARCHITECTURE PATTERN: Centralized Configuration
 * 
 * WHY THIS FILE EXISTS:
 * ---------------------
 * This file centralizes all application configuration in one place following
 * the "Single Source of Truth" principle. This makes it easy to:
 * 
 * 1. Modify settings without hunting through multiple files
 * 2. Support different environments (dev, staging, production)
 * 3. Keep sensitive data (like VAPID keys) in one secure location
 * 4. Enable dependency injection of configuration
 * 
 * DESIGN DECISIONS:
 * -----------------
 * - All config is exported as a frozen object (immutable at runtime)
 * - Default values provided for development environment
 * - Environment variables can override defaults (not implemented for simplicity)
 * 
 * ============================================================================
 */

import webPush from 'web-push';

/**
 * VAPID Keys for Web Push Notifications
 * 
 * VAPID (Voluntary Application Server Identification) is a spec that allows
 * the application server to identify itself to push services.
 * 
 * In production, these should be generated once and stored securely.
 * Generate with: npx web-push generate-vapid-keys
 */
const vapidKeys = webPush.generateVAPIDKeys();

export const config = Object.freeze({
    // Server Configuration
    server: {
        port: 3000,
        host: 'localhost',
    },

    // GraphQL Configuration
    graphql: {
        path: '/graphql',
        playground: true, // Enable GraphQL Playground for testing
    },

    // SSE (Server-Sent Events) Configuration
    sse: {
        path: '/events',
        heartbeatInterval: 30000, // Keep-alive ping every 30 seconds
    },

    // Webhook Configuration
    webhook: {
        // Registered webhook endpoints that will receive notifications
        // In a real app, this would be managed dynamically via API
        endpoints: [] as string[],
        retryAttempts: 3,
        retryDelay: 1000, // ms between retry attempts
    },

    // Push Notification Configuration
    push: {
        vapidPublicKey: vapidKeys.publicKey,
        vapidPrivateKey: vapidKeys.privateKey,
        vapidSubject: 'mailto:bahbouh@chatapp.local',
    },

    // Database (File-based) Configuration
    database: {
        dataDir: './data',
        usersFile: 'users.json',
        messagesFile: 'messages.json',
        roomsFile: 'rooms.json',
        webhooksFile: 'webhooks.json',
        subscriptionsFile: 'push-subscriptions.json',
    },
});

export default config;
