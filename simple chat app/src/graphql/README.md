# GraphQL Module

## Communication Pattern: GraphQL

### Why This Folder Exists

The `graphql/` folder implements the **GraphQL API layer**, providing a flexible, strongly-typed API for our chat application.

### What is GraphQL?

GraphQL is a query language for APIs developed by Facebook. It provides a complete and understandable description of the data in your API and gives clients the power to ask for exactly what they need.

### GraphQL vs REST Comparison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          REST vs GraphQL                                     │
├──────────────────────────────────┬──────────────────────────────────────────┤
│              REST                │              GraphQL                      │
├──────────────────────────────────┼──────────────────────────────────────────┤
│  Multiple endpoints              │  Single endpoint (/graphql)              │
│  GET /users/123                  │                                          │
│  GET /users/123/rooms            │  query {                                 │
│  GET /rooms/456/messages         │    user(id: "123") {                     │
│                                  │      username                            │
│  3 round trips!                  │      rooms { messages { content } }      │
│  May over-fetch data             │    }                                     │
│                                  │  }                                       │
│                                  │  1 request, exact data needed!           │
├──────────────────────────────────┼──────────────────────────────────────────┤
│  Server decides response shape   │  Client decides response shape           │
├──────────────────────────────────┼──────────────────────────────────────────┤
│  Versioning via URL (/v1, /v2)   │  Schema evolution, no versioning needed  │
└──────────────────────────────────┴──────────────────────────────────────────┘
```

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GraphQL Request Flow                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Client                                                                     │
│     │                                                                        │
│     │  POST /graphql                                                         │
│     │  { query: "...", variables: {...} }                                   │
│     ▼                                                                        │
│   ┌────────────────────────────────────────┐                                │
│   │           Apollo Server                 │                                │
│   │  ┌──────────────────────────────────┐  │                                │
│   │  │         Type Definitions          │  │  ← Schema (typeDefs.ts)       │
│   │  │  - Types (User, Message, Room)   │  │                                │
│   │  │  - Queries (read operations)     │  │                                │
│   │  │  - Mutations (write operations)  │  │                                │
│   │  └──────────────────────────────────┘  │                                │
│   │                  ↓                      │                                │
│   │  ┌──────────────────────────────────┐  │                                │
│   │  │           Resolvers               │  │  ← Implementation (resolvers.ts)│
│   │  │  - Query.users → userRepo.findAll│  │                                │
│   │  │  - Mutation.sendMessage → ...    │  │                                │
│   │  │  - User.rooms → roomRepo.find... │  │                                │
│   │  └──────────────────────────────────┘  │                                │
│   └────────────────────────────────────────┘                                │
│                      │                                                       │
│                      ▼                                                       │
│   ┌────────────────────────────────────────┐                                │
│   │            Repositories                 │                                │
│   │  (Data access layer)                   │                                │
│   └────────────────────────────────────────┘                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Concepts

| Concept | Description | Example |
|---------|-------------|---------|
| **Type** | Data shape definition | `type User { id: ID!, username: String! }` |
| **Query** | Read operation | `users: [User!]!` |
| **Mutation** | Write operation | `createUser(username: String!): User!` |
| **Resolver** | Function that fetches data | `users: () => userRepo.findAll()` |
| **Field Resolver** | Resolves nested fields | `User.rooms: (user) => ...` |

### Files

| File | Purpose |
|------|---------|
| `typeDefs.ts` | GraphQL Schema Definition Language (SDL) |
| `resolvers.ts` | Functions that implement the schema |
| `index.ts` | Module exports |

### Testing with Postman

1. **Endpoint**: `POST http://localhost:3000/graphql`
2. **Content-Type**: `application/json`
3. **Body**:
```json
{
  "query": "query { users { id username email } }"
}
```

### Sample Queries

```graphql
# Get all users
query {
  users {
    id
    username
    isOnline
  }
}

# Get room with messages
query {
  room(id: "room-id") {
    name
    members { username }
    messages {
      content
      sender { username }
      createdAt
    }
  }
}

# Send a message
mutation {
  sendMessage(
    roomId: "room-id"
    senderId: "user-id"
    content: "Hello, world!"
  ) {
    id
    content
    createdAt
  }
}
```

### Event Integration

When mutations modify data, they emit events:

```
sendMessage mutation
        │
        ├──► Returns Message (GraphQL response)
        │
        └──► Emits 'message.created' event
                    │
                    ├──► SSE broadcasts to clients
                    ├──► Webhooks POST to external services
                    └──► Push notifications to browsers
```

This demonstrates how GraphQL integrates with other communication patterns!
