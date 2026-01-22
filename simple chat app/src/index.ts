/**
 * ============================================================================
 * MAIN APPLICATION ENTRY POINT
 * ============================================================================
 * 
 * ARCHITECTURE: Express + Apollo Server + Multiple Communication Patterns
 * 
 * WHY THIS FILE EXISTS:
 * ---------------------
 * This is the main entry point that:
 * 1. Creates the Express application
 * 2. Sets up middleware (CORS, body parsing)
 * 3. Mounts the Apollo GraphQL server
 * 4. Mounts REST/SSE routes
 * 5. Initializes all services
 * 6. Starts the HTTP server
 * 
 * APPLICATION ARCHITECTURE:
 * -------------------------
 * 
 *                           ┌─────────────────────────────────────────┐
 *                           │              CLIENT                     │
 *                           │   (Postman, Browser, External App)     │
 *                           └─────────────────┬───────────────────────┘
 *                                             │
 *                                             │ HTTP
 *                                             ▼
 *   ┌─────────────────────────────────────────────────────────────────────────┐
 *   │                         EXPRESS APPLICATION                              │
 *   ├─────────────────────────────────────────────────────────────────────────┤
 *   │                                                                          │
 *   │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
 *   │  │   Middleware    │  │   Middleware    │  │      Middleware         │  │
 *   │  │   CORS          │  │   Body Parser   │  │   Request Logging       │  │
 *   │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
 *   │                                                                          │
 *   ├─────────────────────────────────────────────────────────────────────────┤
 *   │                              ROUTES                                      │
 *   │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
 *   │  │  POST /graphql  │  │   GET /events   │  │   POST /webhooks        │  │
 *   │  │  Apollo Server  │  │   SSE Stream    │  │   Webhook Mgmt          │  │
 *   │  │  (GraphQL)      │  │   (Real-time)   │  │   (REST)                │  │
 *   │  └────────┬────────┘  └────────┬────────┘  └────────┬────────────────┘  │
 *   │           │                    │                    │                    │
 *   └───────────┼────────────────────┼────────────────────┼────────────────────┘
 *               │                    │                    │
 *               ▼                    ▼                    ▼
 *   ┌─────────────────────────────────────────────────────────────────────────┐
 *   │                         SERVICES LAYER                                   │
 *   │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
 *   │  │  Event Emitter  │  │   SSE Service   │  │   Webhook Service       │  │
 *   │  │  (Event Bus)    │  │   (Broadcast)   │  │   (HTTP POST)           │  │
 *   │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
 *   └───────────────────────────────────────────────────────────────────────────┘
 *               │
 *               ▼
 *   ┌─────────────────────────────────────────────────────────────────────────┐
 *   │                       REPOSITORY LAYER                                   │
 *   │         (In-memory data store with JSON file persistence)               │
 *   └─────────────────────────────────────────────────────────────────────────┘
 * 
 * 
 * COMMUNICATION PATTERNS SUPPORTED:
 * ----------------------------------
 * 1. GraphQL    - Flexible queries and mutations via /graphql
 * 2. SSE        - Real-time server-to-client events via /events
 * 3. Webhooks   - Push notifications to external services
 * 4. Push       - Browser push notifications even when tab is closed
 * 
 * ============================================================================
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ApolloServer } from 'apollo-server-express';
import config from './config';
import { typeDefs, resolvers } from './graphql';
import { sseRoutes, webhookRoutes, pushRoutes } from './routes';

// Import services to initialize them (they register event listeners on import)
import './services';

/**
 * Create and configure the Express application
 */
async function createApp(): Promise<Application> {
    const app: Application = express();

    // ========================================================================
    // MIDDLEWARE
    // ========================================================================

    /**
     * CORS (Cross-Origin Resource Sharing)
     * 
     * Allows requests from different origins (domains).
     * Essential for web apps where frontend and backend are on different domains.
     */
    app.use(cors());

    /**
     * Body Parser
     * 
     * Parses incoming JSON request bodies.
     * Makes req.body available in route handlers.
     */
    app.use(express.json());

    /**
     * Request Logging Middleware
     * 
     * Logs all incoming requests for debugging purposes.
     * In production, you'd use a more sophisticated logger (winston, pino).
     */
    app.use((req: Request, _res: Response, next: NextFunction) => {
        // Don't log SSE heartbeat checks or frequent polling
        if (req.path !== '/events/status') {
            console.log(`[HTTP] ${req.method} ${req.path}`);
        }
        next();
    });

    // ========================================================================
    // GRAPHQL SERVER
    // ========================================================================

    /**
     * Apollo Server Setup
     * 
     * Apollo Server is the most popular GraphQL server for Node.js.
     * It provides:
     * - Schema validation
     * - GraphQL Playground (interactive query builder)
     * - Error handling
     * - Performance tracing
     */
    const apolloServer = new ApolloServer({
        typeDefs,
        resolvers,
        // Enable introspection and playground for development
        introspection: true,
    });

    // Start Apollo Server
    await apolloServer.start();
    
    // Mount Apollo Server as Express middleware
    // Cast to any to avoid type conflicts between different @types/express versions
    apolloServer.applyMiddleware({
        app: app as any,
        path: config.graphql.path,
    });

    console.log(`[GraphQL] Apollo Server mounted at ${config.graphql.path}`);

    // ========================================================================
    // REST & SSE ROUTES
    // ========================================================================

    /**
     * SSE Routes - Server-Sent Events
     * 
     * Clients connect to /events to receive real-time updates.
     * Connection stays open and server pushes events as they occur.
     */
    app.use('/events', sseRoutes);
    console.log('[SSE] Routes mounted at /events');

    /**
     * Webhook Routes - HTTP Callback Management
     * 
     * External services register webhooks to receive notifications
     * when events occur in our system.
     */
    app.use('/webhooks', webhookRoutes);
    console.log('[Webhooks] Routes mounted at /webhooks');

    /**
     * Push Notification Routes
     * 
     * Endpoints for managing browser push notification subscriptions.
     */
    app.use('/push', pushRoutes);
    console.log('[Push] Routes mounted at /push');

    // ========================================================================
    // HEALTH CHECK & INFO ENDPOINTS
    // ========================================================================

    /**
     * Health Check Endpoint
     * 
     * Used by load balancers, container orchestrators (K8s), and monitoring
     * to verify the application is running and healthy.
     */
    app.get('/health', (_req: Request, res: Response) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    });

    /**
     * API Info Endpoint
     * 
     * Provides information about available endpoints and communication patterns.
     * Useful for developers exploring the API.
     */
    app.get('/', (_req: Request, res: Response) => {
        res.json({
            name: 'Chat Application API',
            version: '1.0.0',
            description: 'A chat application demonstrating multiple communication patterns',
            endpoints: {
                graphql: {
                    path: '/graphql',
                    method: 'POST',
                    description: 'GraphQL API for queries and mutations',
                    playground: '/graphql (in browser)',
                },
                sse: {
                    path: '/events',
                    method: 'GET',
                    description: 'Server-Sent Events stream for real-time updates',
                    status: '/events/status',
                },
                webhooks: {
                    path: '/webhooks',
                    methods: ['GET', 'POST', 'DELETE'],
                    description: 'Webhook registration and management',
                    test: '/webhooks/test',
                },
                push: {
                    path: '/push',
                    methods: ['GET', 'POST', 'DELETE'],
                    description: 'Push notification subscription management',
                    vapidKey: '/push/vapid-public-key',
                },
                health: {
                    path: '/health',
                    method: 'GET',
                    description: 'Health check endpoint',
                },
            },
            communicationPatterns: [
                'GraphQL - Flexible queries and mutations',
                'SSE - Real-time server-to-client events',
                'Webhooks - Push notifications to external services',
                'Web Push - Browser push notifications',
            ],
        });
    });

    // ========================================================================
    // ERROR HANDLING
    // ========================================================================

    /**
     * 404 Handler
     * 
     * Catches requests to undefined routes.
     */
    app.use((_req: Request, res: Response) => {
        res.status(404).json({
            error: 'Not Found',
            message: 'The requested endpoint does not exist',
            availableEndpoints: ['/', '/graphql', '/events', '/webhooks', '/push', '/health'],
        });
    });

    /**
     * Global Error Handler
     * 
     * Catches any unhandled errors in the request pipeline.
     */
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
        console.error('[Error]', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message,
        });
    });

    return app;
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
    try {
        const app = await createApp();

        app.listen(config.server.port, () => {
            console.log('\n========================================');
            console.log('   CHAT APPLICATION SERVER STARTED');
            console.log('========================================\n');
            console.log(`Server running at http://${config.server.host}:${config.server.port}`);
            console.log('\nAvailable endpoints:');
            console.log(`  - GraphQL:    http://${config.server.host}:${config.server.port}/graphql`);
            console.log(`  - SSE:        http://${config.server.host}:${config.server.port}/events`);
            console.log(`  - Webhooks:   http://${config.server.host}:${config.server.port}/webhooks`);
            console.log(`  - Push:       http://${config.server.host}:${config.server.port}/push`);
            console.log(`  - Health:     http://${config.server.host}:${config.server.port}/health`);
            console.log('\nOpen GraphQL Playground in your browser:');
            console.log(`  http://${config.server.host}:${config.server.port}/graphql`);
            console.log('\n');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();
