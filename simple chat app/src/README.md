# Source Code Structure

## Architecture Overview

This chat application follows a **layered architecture** with **event-driven communication**. Each folder represents a distinct layer with specific responsibilities.

```
src/
│
├── index.ts              ← Entry Point: Bootstraps Express + Apollo Server
│
├── config/               ← Configuration Layer
│   ├── index.ts          │  Centralized app settings
│   └── README.md         │  Why: Single source of truth
│
├── models/               ← Domain Layer
│   ├── types.ts          │  Entity interfaces (User, Message, Room)
│   └── README.md         │  Why: Type safety, documentation
│
├── repositories/         ← Data Access Layer
│   ├── BaseRepository.ts │  Generic CRUD with file persistence
│   ├── UserRepository.ts │  User-specific queries
│   ├── MessageRepository.ts│ Message-specific queries
│   ├── RoomRepository.ts │  Room + membership management
│   ├── WebhookRepository.ts│ Webhook subscriptions
│   ├── PushSubscriptionRepository.ts│ Push notification subscriptions
│   └── README.md         │  Why: Repository pattern, abstraction
│
├── services/             ← Business Logic Layer
│   ├── EventEmitter.ts   │  Central event bus (Observer pattern)
│   ├── SSEService.ts     │  Server-Sent Events broadcasting
│   ├── WebhookService.ts │  HTTP callbacks to external services
│   ├── PushService.ts    │  Browser push notifications
│   └── README.md         │  Why: Event-driven architecture
│
├── graphql/              ← API Layer (GraphQL)
│   ├── typeDefs.ts       │  Schema definitions
│   ├── resolvers.ts      │  Query/Mutation implementations
│   └── README.md         │  Why: GraphQL communication pattern
│
└── routes/               ← API Layer (REST/SSE)
    ├── sseRoutes.ts      │  SSE connection endpoint
    ├── webhookRoutes.ts  │  Webhook management endpoints
    ├── pushRoutes.ts     │  Push subscription endpoints
    └── README.md         │  Why: Express router pattern
```

## Layered Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT                                    │
│              (Postman, Browser, External Service)               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/GraphQL
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                           │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │    GraphQL      │  │   REST Routes   │  │   SSE Routes    │ │
│  │    /graphql     │  │   /webhooks     │  │   /events       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ Function calls
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                               │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  EventEmitter   │  │   SSEService    │  │ WebhookService  │ │
│  │  (Event Bus)    │  │   (Broadcast)   │  │  (HTTP POST)    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ Repository calls
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REPOSITORY LAYER                              │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ UserRepository  │  │MessageRepository│  │ RoomRepository  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ File I/O
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER                             │
│                                                                  │
│                     data/*.json files                            │
└─────────────────────────────────────────────────────────────────┘
```

## Communication Patterns

### 1. GraphQL (Request-Response)
```
Client ──POST /graphql──> Server ──Response──> Client
         { query: "..." }           { data: {...} }
```

### 2. SSE (Server Push)
```
Client ──GET /events──> Server
         <──────────── event: message
         <──────────── data: {...}
         <──────────── (stream continues...)
```

### 3. Webhooks (HTTP Callbacks)
```
External ──POST /webhooks──> Register
              
Later, when event occurs:
Server ──POST (payload)──> External Service URL
```

### 4. Push Notifications
```
Browser ──Subscribe──> Push Service (FCM/Mozilla)
Server ──Push msg──> Push Service ──Notification──> Browser
```

## Event Flow (sendMessage Example)

```
1. Client sends GraphQL mutation
   │
2. ├── GraphQL Resolver creates message
   │   │
3. │   └── Repository saves to JSON file
   │
4. └── Resolver emits 'message.created' event
        │
        ├──► SSEService broadcasts to connected clients
        │
        ├──► WebhookService POSTs to registered URLs
        │
        └──► PushService sends browser push notifications
```

## Design Principles Used

1. **Separation of Concerns**: Each layer has one responsibility
2. **Dependency Inversion**: Upper layers depend on abstractions
3. **Single Responsibility**: Each class/module does one thing
4. **Observer Pattern**: Loose coupling via event emitter
5. **Repository Pattern**: Abstract data access from business logic
