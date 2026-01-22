# Configuration Module

## Architecture Pattern: Centralized Configuration

### Why This Folder Exists

The `config/` folder implements the **Centralized Configuration Pattern**, which is a fundamental architectural decision for any backend application.

### Design Philosophy

```
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │              CONFIG MODULE                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │
│  │  │  Server  │  │ Database │  │  Push    │       │  │
│  │  │  Config  │  │  Config  │  │  Config  │       │  │
│  │  └──────────┘  └──────────┘  └──────────┘       │  │
│  └──────────────────────────────────────────────────┘  │
│           ↓               ↓              ↓              │
│    ┌──────────┐    ┌──────────┐    ┌──────────┐       │
│    │  Routes  │    │   Repos  │    │ Services │       │
│    └──────────┘    └──────────┘    └──────────┘       │
└─────────────────────────────────────────────────────────┘
```

### Benefits

1. **Single Source of Truth**: All configuration values in one place
2. **Environment Flexibility**: Easy to switch between dev/staging/prod
3. **Security**: Sensitive values centralized for easier management
4. **Testability**: Configuration can be mocked in tests
5. **Documentation**: Self-documenting through code comments

### Files

| File | Purpose |
|------|---------|
| `index.ts` | Main configuration export with all app settings |

### Communication Patterns Configured Here

- **GraphQL**: Path and playground settings
- **SSE**: Event stream path and heartbeat intervals
- **Webhooks**: Retry logic configuration
- **Push**: VAPID keys for Web Push API
