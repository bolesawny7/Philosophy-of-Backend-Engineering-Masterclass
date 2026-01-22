# Chat Application - Communication Patterns Demo

A simple chat application built with **Express**, **TypeScript**, and **GraphQL** that demonstrates multiple backend communication patterns.

##  Purpose

This project is designed to teach backend engineering concepts by implementing a fully functional chat application that uses:

1. **GraphQL** - For flexible data queries and mutations
2. **Server-Sent Events (SSE)** - For real-time updates to connected clients
3. **Webhooks** - For push notifications to external services
4. **Web Push** - For browser push notifications

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CHAT APPLICATION                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────────────────────┐│
│   │   GraphQL   │      │     SSE     │      │        Webhooks             ││
│   │  /graphql   │      │  /events    │      │       /webhooks             ││
│   │  Query &    │      │  Real-time  │      │   External service          ││
│   │  Mutation   │      │    Push     │      │     callbacks               ││
│   └──────┬──────┘      └──────┬──────┘      └────────────┬────────────────┘│
│          │                    │                          │                  │
│          └────────────────────┼──────────────────────────┘                  │
│                               │                                              │
│                               ▼                                              │
│                    ┌──────────────────────┐                                 │
│                    │    Event Emitter     │                                 │
│                    │   (Observer Pattern) │                                 │
│                    └──────────────────────┘                                 │
│                               │                                              │
│                               ▼                                              │
│                    ┌──────────────────────┐                                 │
│                    │    Repositories      │                                 │
│                    │  (File-based DB)     │                                 │
│                    └──────────────────────┘                                 │
│                               │                                              │
│                               ▼                                              │
│                    ┌──────────────────────┐                                 │
│                    │    JSON Files        │                                 │
│                    │   (data/*.json)      │                                 │
│                    └──────────────────────┘                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
src/
├── index.ts              # Application entry point
├── config/               # Configuration management
│   └── README.md         # Why: Centralized configuration pattern
├── models/               # Data types and interfaces
│   └── README.md         # Why: Domain/Entity layer
├── repositories/         # Data access layer
│   └── README.md         # Why: Repository pattern
├── services/             # Business logic and event handling
│   └── README.md         # Why: Event-driven architecture
├── graphql/              # GraphQL schema and resolvers
│   └── README.md         # Why: GraphQL communication pattern
├── routes/               # HTTP route handlers
│   └── README.md         # Why: Express router pattern
└── data/                 # Persisted JSON data files
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
# Development mode (with ts-node)
npm run dev

# Or build and run
npm run build
npm start
```

### 3. Access the Application

- **API Info**: http://localhost:3000/
- **GraphQL Playground**: http://localhost:3000/graphql
- **SSE Stream**: http://localhost:3000/events
- **Health Check**: http://localhost:3000/health

## Communication Patterns

### 1. GraphQL (`/graphql`)

**Pattern**: Query Language for APIs

GraphQL allows clients to request exactly the data they need in a single request.

```graphql
# Create a user
mutation {
  createUser(username: "john", email: "john@example.com") {
    id
    username
  }
}

# Create a room
mutation {
  createRoom(name: "General", description: "General chat", creatorId: "user-id") {
    id
    name
  }
}

# Send a message
mutation {
  sendMessage(roomId: "room-id", senderId: "user-id", content: "Hello!") {
    id
    content
    createdAt
  }
}

# Query rooms with messages
query {
  rooms {
    name
    members { username }
    messages {
      content
      sender { username }
    }
  }
}
```

### 2. Server-Sent Events (`/events`)

**Pattern**: Server-to-Client Push

SSE provides a persistent one-way connection for real-time updates.

```bash
# Connect to event stream
curl -N http://localhost:3000/events

# With room filter
curl -N "http://localhost:3000/events?roomId=your-room-id"
```

**Events received**:
- `connected` - Initial connection confirmation
- `message` - New message in a room
- `user_joined` - User joined a room
- `user_left` - User left a room
- `room_created` - New room created

### 3. Webhooks (`/webhooks`)

**Pattern**: HTTP Callbacks

Webhooks notify external services when events occur.

```bash
# Register a webhook
curl -X POST http://localhost:3000/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://localhost:3000/webhooks/test",
    "events": ["message.created", "user.joined"]
  }'

# List webhooks
curl http://localhost:3000/webhooks

# Delete a webhook
curl -X DELETE http://localhost:3000/webhooks/{id}
```

### 4. Web Push (`/push`)

**Pattern**: Browser Push Notifications

Web Push sends notifications to users even when they're not on the page.

```bash
# Get VAPID public key (needed by browser)
curl http://localhost:3000/push/vapid-public-key

# Register a subscription
curl -X POST http://localhost:3000/push/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id",
    "subscription": {
      "endpoint": "https://fcm.googleapis.com/...",
      "keys": { "p256dh": "...", "auth": "..." }
    }
  }'
```

## 🧪 Testing with Postman

### Step 1: Create Users

```
POST http://localhost:3000/graphql
Content-Type: application/json

{
  "query": "mutation { createUser(username: \"alice\", email: \"alice@test.com\") { id username } }"
}
```

### Step 2: Create a Room

```
POST http://localhost:3000/graphql
Content-Type: application/json

{
  "query": "mutation { createRoom(name: \"General\", description: \"Main chat\", creatorId: \"USER_ID_FROM_STEP_1\") { id name } }"
}
```

### Step 3: Register a Webhook (to see notifications)

```
POST http://localhost:3000/webhooks
Content-Type: application/json

{
  "url": "http://localhost:3000/webhooks/test",
  "events": ["message.created"]
}
```

### Step 4: Connect to SSE (in another terminal)

```bash
curl -N http://localhost:3000/events
```

### Step 5: Send a Message

```
POST http://localhost:3000/graphql
Content-Type: application/json

{
  "query": "mutation { sendMessage(roomId: \"ROOM_ID\", senderId: \"USER_ID\", content: \"Hello, World!\") { id content createdAt } }"
}
```

**Observe**:
- GraphQL returns the message
- SSE client receives the message event
- Webhook test endpoint logs the payload

## 📚 Learning Resources

Each folder contains a `README.md` explaining:
- **Why** this architectural pattern is used
- **How** the communication pattern works
- **When** to use this pattern
- **Diagrams** showing data flow

## 🔧 Configuration

See [src/config/README.md](src/config/README.md) for configuration options.

## 📝 License

MIT
