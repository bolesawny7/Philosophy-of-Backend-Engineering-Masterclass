# Repositories Module

## Architecture Pattern: Repository Pattern

### Why This Folder Exists

The `repositories/` folder implements the **Repository Pattern**, which provides an abstraction layer between the business logic and the data persistence mechanism.

### Design Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REPOSITORY PATTERN                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│   │   Service    │     │   GraphQL    │     │   Webhook    │               │
│   │   Layer      │     │   Resolvers  │     │   Service    │               │
│   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘               │
│          │                    │                    │                        │
│          └────────────────────┼────────────────────┘                        │
│                               │                                              │
│                               ▼                                              │
│          ╔════════════════════════════════════════════╗                     │
│          ║         REPOSITORY LAYER                    ║                     │
│          ║   ┌────────────┐  ┌────────────────────┐   ║                     │
│          ║   │   Base     │  │ Entity-Specific    │   ║                     │
│          ║   │ Repository │◄─│ Repositories       │   ║                     │
│          ║   │  (Generic) │  │ (UserRepo, etc.)   │   ║                     │
│          ║   └────────────┘  └────────────────────┘   ║                     │
│          ╚════════════════════════════════════════════╝                     │
│                               │                                              │
│                               ▼                                              │
│                    ┌──────────────────────┐                                 │
│                    │   File System        │                                 │
│                    │   (JSON Files)       │                                 │
│                    └──────────────────────┘                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Benefits

1. **Abstraction**: Business logic doesn't know HOW data is stored
2. **Testability**: Easy to mock repositories in unit tests
3. **Flexibility**: Can switch from JSON files to MongoDB without changing services
4. **Centralization**: All data access logic in one place
5. **Consistency**: Common patterns for all entities

### Repository Hierarchy

```
BaseRepository<T> (Generic CRUD)
    │
    ├── UserRepository
    │       └── User-specific queries (findByUsername, findOnlineUsers)
    │
    ├── MessageRepository
    │       └── Chat-specific queries (findByRoom, pagination)
    │
    ├── RoomRepository
    │       └── Membership queries (addMember, isMember)
    │
    ├── WebhookRepository          ← WEBHOOKS pattern
    │       └── Event subscription queries
    │
    └── PushSubscriptionRepository  ← PUSH NOTIFICATIONS pattern
            └── Device subscription management
```

### Files

| File | Purpose |
|------|---------|
| `BaseRepository.ts` | Generic CRUD operations with file persistence |
| `UserRepository.ts` | User entity management |
| `MessageRepository.ts` | Message entity with chat-specific queries |
| `RoomRepository.ts` | Room entity with membership management |
| `WebhookRepository.ts` | Webhook subscription storage |
| `PushSubscriptionRepository.ts` | Browser push subscription storage |
| `index.ts` | Module exports (singleton instances) |

### Singleton Pattern

All repositories are exported as singleton instances to ensure:
- Consistent in-memory cache across the application
- Single file handle per data file
- Predictable behavior in concurrent scenarios

### Data Storage

Data is persisted as JSON files in the `/data` directory:
```
data/
├── users.json
├── messages.json
├── rooms.json
├── webhooks.json
└── push-subscriptions.json
```

### Communication Patterns Supported

| Repository | Communication Pattern | Purpose |
|------------|----------------------|---------|
| WebhookRepository | **HTTP Webhooks** | Store external service callbacks |
| PushSubscriptionRepository | **Web Push** | Store browser push subscriptions |
