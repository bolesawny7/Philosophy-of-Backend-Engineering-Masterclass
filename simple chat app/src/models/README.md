# Models Module

## Architecture Pattern: Domain/Entity Layer

### Why This Folder Exists

The `models/` folder contains the **Domain Entities** - the core data structures that represent our business objects. This is the foundation of our application's data layer.

### Design Philosophy

```
┌─────────────────────────────────────────────────────────┐
│                   LAYERED ARCHITECTURE                   │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐  │
│  │                PRESENTATION LAYER                  │  │
│  │         (Routes, GraphQL, SSE Endpoints)          │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↓                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │                 SERVICE LAYER                      │  │
│  │        (Business Logic, Event Emission)           │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↓                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │              REPOSITORY LAYER                      │  │
│  │          (Data Access, Persistence)               │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↓                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │            ★ MODELS LAYER (This folder) ★         │  │
│  │           (Entities, Types, Interfaces)           │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Key Entities

| Entity | Purpose | Communication Pattern |
|--------|---------|----------------------|
| `User` | Chat participant | - |
| `Message` | Chat message | GraphQL, SSE |
| `Room` | Chat room/channel | GraphQL |
| `WebhookSubscription` | External callback registration | Webhooks |
| `PushSubscriptionData` | Browser push registration | Push Notifications |

### Why TypeScript Interfaces?

1. **Type Safety**: Catch errors at compile time
2. **Documentation**: Types serve as living documentation
3. **IDE Support**: Better autocomplete and refactoring
4. **No Runtime Cost**: Interfaces are erased at runtime

### Files

| File | Purpose |
|------|---------|
| `types.ts` | All entity interfaces and type definitions |
