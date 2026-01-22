# Routes Module

## Architecture Pattern: Express Router Pattern

### Why This Folder Exists

The `routes/` folder contains Express router definitions that map HTTP endpoints to handler functions. This follows the **Express Router Pattern** for modular route organization.

### Design Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ROUTE ORGANIZATION                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Incoming HTTP Request                                                      │
│           │                                                                  │
│           ▼                                                                  │
│   ┌───────────────────────────────────────────────────────────────────┐     │
│   │                       Express App                                  │     │
│   │   app.use('/graphql', apolloServer)  ← GraphQL endpoint           │     │
│   │   app.use('/events', sseRoutes)      ← SSE endpoint               │     │
│   │   app.use('/webhooks', webhookRoutes) ← Webhook management        │     │
│   │   app.use('/push', pushRoutes)       ← Push notification mgmt     │     │
│   └───────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Endpoint Overview

| Endpoint | Method | Description | Communication Pattern |
|----------|--------|-------------|----------------------|
| `/graphql` | POST | GraphQL API | **GraphQL** |
| `/events` | GET | SSE stream connection | **SSE** |
| `/events/status` | GET | SSE connection status | REST |
| `/webhooks` | POST | Register webhook | **Webhooks** |
| `/webhooks` | GET | List webhooks | REST |
| `/webhooks/:id` | DELETE | Unregister webhook | REST |
| `/webhooks/test` | POST | Test webhook receiver | REST |
| `/push/vapid-public-key` | GET | Get VAPID key | **Push** |
| `/push/subscribe` | POST | Register push subscription | **Push** |
| `/push/test` | POST | Send test notification | REST |

### Files

| File | Purpose |
|------|---------|
| `sseRoutes.ts` | Server-Sent Events connection endpoint |
| `webhookRoutes.ts` | Webhook registration and management |
| `pushRoutes.ts` | Push notification subscription management |
| `index.ts` | Module exports |

### Testing with Postman

#### 1. GraphQL (Query/Mutation)
```
POST http://localhost:3000/graphql
Content-Type: application/json

{
  "query": "mutation { createUser(username: \"john\", email: \"john@example.com\") { id username } }"
}
```

#### 2. SSE (Connect and receive events)
```
GET http://localhost:3000/events

(Keep connection open - events will stream in)
```

#### 3. Webhooks (Register a webhook)
```
POST http://localhost:3000/webhooks
Content-Type: application/json

{
  "url": "http://localhost:3000/webhooks/test",
  "events": ["message.created"]
}
```

#### 4. Push (Get VAPID key)
```
GET http://localhost:3000/push/vapid-public-key
```

### Route vs Controller Pattern

We use a simplified approach where route handlers contain the logic directly.
For larger applications, you might separate:

```
routes/          → Define endpoints, validate input
controllers/     → Handle request/response logic
services/        → Business logic
repositories/    → Data access
```

Our simplified structure:
```
routes/          → Define endpoints + handle logic
services/        → Business logic + communication
repositories/    → Data access
```
