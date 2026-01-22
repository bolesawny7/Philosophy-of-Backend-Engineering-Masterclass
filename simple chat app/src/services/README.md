# Services Module

## Architecture Pattern: Service Layer + Event-Driven Architecture

### Why This Folder Exists

The `services/` folder implements the **Service Layer** and **Event-Driven Architecture**. Services encapsulate business logic and handle communication between different parts of the system.

### Design Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EVENT-DRIVEN ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                           ┌─────────────────────┐                           │
│                           │   GraphQL Mutation  │                           │
│                           │    (sendMessage)    │                           │
│                           └──────────┬──────────┘                           │
│                                      │                                       │
│                                      │ emit('message.created')               │
│                                      ▼                                       │
│                           ╔═════════════════════╗                           │
│                           ║   EVENT EMITTER     ║                           │
│                           ║  (Central Event Bus)║                           │
│                           ╚════════════╤════════╝                           │
│                                        │                                     │
│              ┌─────────────────────────┼─────────────────────────┐          │
│              │                         │                         │          │
│              ▼                         ▼                         ▼          │
│     ┌────────────────┐      ┌────────────────┐      ┌────────────────┐     │
│     │  SSE SERVICE   │      │WEBHOOK SERVICE │      │ PUSH SERVICE   │     │
│     │                │      │                │      │                │     │
│     │ Broadcasts to  │      │ POSTs to       │      │ Sends browser  │     │
│     │ connected      │      │ registered     │      │ push           │     │
│     │ clients        │      │ endpoints      │      │ notifications  │     │
│     └────────────────┘      └────────────────┘      └────────────────┘     │
│              │                         │                         │          │
│              ▼                         ▼                         ▼          │
│     ┌────────────────┐      ┌────────────────┐      ┌────────────────┐     │
│     │    Browsers    │      │   External     │      │   Browser      │     │
│     │   (Real-time   │      │   Services     │      │   (Background  │     │
│     │    updates)    │      │                │      │    notifs)     │     │
│     └────────────────┘      └────────────────┘      └────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Communication Patterns Implemented

| Service | Pattern | Direction | Use Case |
|---------|---------|-----------|----------|
| `SSEService` | **Server-Sent Events** | Server → Client | Real-time feed updates |
| `WebhookService` | **HTTP Webhooks** | Server → External Service | Third-party integrations |
| `PushService` | **Web Push** | Server → Browser | Background notifications |
| `EventEmitter` | **Observer Pattern** | Internal | Decouple components |

### Files

| File | Purpose |
|------|---------|
| `EventEmitter.ts` | Central event bus (Observer pattern) |
| `SSEService.ts` | Server-Sent Events for real-time updates |
| `WebhookService.ts` | HTTP callbacks to external services |
| `PushService.ts` | Browser push notifications |
| `index.ts` | Module exports |

### Communication Pattern Comparison

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    WHEN TO USE WHICH PATTERN                                │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐                                                   │
│  │ User is on the page │───> SSE (Server-Sent Events)                      │
│  │ and needs real-time │     • Continuous connection                       │
│  │ updates             │     • Low latency                                 │
│  └─────────────────────┘     • Server → Client only                        │
│                                                                             │
│  ┌─────────────────────┐                                                   │
│  │ External service    │───> Webhooks                                      │
│  │ needs to know when  │     • HTTP POST to their URL                      │
│  │ events happen       │     • Fire and forget                             │
│  └─────────────────────┘     • Server → External Server                    │
│                                                                             │
│  ┌─────────────────────┐                                                   │
│  │ User closed the tab │───> Push Notifications                            │
│  │ but should still    │     • Works in background                         │
│  │ be notified         │     • Via browser push service                    │
│  └─────────────────────┘     • Server → Browser (via FCM/etc)              │
│                                                                             │
│  ┌─────────────────────┐                                                   │
│  │ Need bidirectional  │───> WebSockets (not implemented)                  │
│  │ communication       │     • Full duplex                                 │
│  │ (typing indicators) │     • More complex                                │
│  └─────────────────────┘     • Higher resource usage                       │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### Event Flow Example

When a user sends a message:

```
1. GraphQL Mutation (sendMessage)
   │
   ├── Create message in repository
   │
   └── Emit 'message.created' event
            │
            ├──► SSEService
            │    └── Broadcasts to all connected SSE clients in the room
            │
            ├──► WebhookService
            │    └── POSTs to all webhooks subscribed to 'message.created'
            │
            └──► PushService
                 └── Sends push notifications to room members (except sender)
```

### Key Design Decisions

1. **Loose Coupling**: Services don't know about each other; they only know about events
2. **Single Responsibility**: Each service handles one communication pattern
3. **Fail-Safe**: Failure in one service doesn't affect others
4. **Extensibility**: Add new services by subscribing to existing events
