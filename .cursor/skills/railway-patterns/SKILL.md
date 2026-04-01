# Railway Patterns

> Multi-service architecture patterns for production apps

## Activation Triggers

- Building full-stack applications
- Microservices architecture
- Production deployments
- Multi-service communication
- Complex project structures

---

## Pattern 1: Frontend + Backend + Database

The most common full-stack pattern.

### Architecture
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│  Postgres   │
│  (Next.js)  │     │  (Express)  │     │  (Database) │
└─────────────┘     └─────────────┘     └─────────────┘
     Public              Public            Private
```

### Deployment Sequence
```
1. check-railway-status
2. create-project-and-link
3. deploy-template "Postgres database"
4. Deploy backend:
   - link-service to backend directory
   - set-variables:
     DATABASE_URL=${{Postgres.DATABASE_URL}}
     NODE_ENV=production
   - deploy
   - generate-domain
5. Deploy frontend:
   - Create new service for frontend
   - set-variables:
     NEXT_PUBLIC_API_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}
   - deploy
   - generate-domain
```

### Environment Variables

**Backend:**
```
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=xxx
```

**Frontend:**
```
NEXT_PUBLIC_API_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}
```

---

## Pattern 2: API + Worker + Queue

For background job processing.

### Architecture
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│     API     │────▶│    Redis    │◀────│   Worker    │
│  (Express)  │     │   (Queue)   │     │  (Processor)│
└─────────────┘     └─────────────┘     └─────────────┘
     Public            Private            Private
```

### Deployment Sequence
```
1. deploy-template "Redis"
2. Deploy API:
   - set-variables:
     REDIS_URL=${{Redis.REDIS_URL}}
   - deploy
   - generate-domain
3. Deploy Worker:
   - set-variables:
     REDIS_URL=${{Redis.REDIS_URL}}
   - deploy
   - (no domain needed - internal only)
```

### Code Pattern (Bull/BullMQ)

**API (queue producer):**
```javascript
import { Queue } from 'bullmq';

const queue = new Queue('jobs', {
  connection: { url: process.env.REDIS_URL }
});

// Add job
await queue.add('process-data', { data: '...' });
```

**Worker (queue consumer):**
```javascript
import { Worker } from 'bullmq';

const worker = new Worker('jobs', async (job) => {
  // Process job
  console.log('Processing:', job.data);
}, {
  connection: { url: process.env.REDIS_URL }
});
```

---

## Pattern 3: Microservices

Multiple services communicating internally.

### Architecture
```
┌─────────────┐
│   Gateway   │
│   (Public)  │
└──────┬──────┘
       │
   ┌───┴───┐
   ▼       ▼
┌──────┐ ┌──────┐
│Users │ │Orders│
│ API  │ │ API  │
└──────┘ └──────┘
Private   Private
   │         │
   ▼         ▼
┌──────┐ ┌──────┐
│UserDB│ │Order │
│      │ │  DB  │
└──────┘ └──────┘
```

### Private Networking
Use `RAILWAY_PRIVATE_DOMAIN` for internal communication:

```
# Gateway environment:
USERS_API=http://${{users-api.RAILWAY_PRIVATE_DOMAIN}}:3001
ORDERS_API=http://${{orders-api.RAILWAY_PRIVATE_DOMAIN}}:3002
```

### Benefits
- No egress costs for internal traffic
- Lower latency
- Services not exposed publicly

---

## Pattern 4: Monorepo Deployment

Single repo with multiple apps.

### Structure
```
my-monorepo/
├── apps/
│   ├── web/           # Frontend
│   ├── api/           # Backend
│   └── worker/        # Background jobs
├── packages/
│   └── shared/        # Shared code
└── package.json
```

### Deployment
```
1. Create project
2. For each app:
   - Create service
   - Set root directory to apps/<name>
   - Configure build command
   - Deploy
```

### railway.toml per app

**apps/web/railway.toml:**
```toml
[build]
buildCommand = "cd ../.. && npm run build:web"

[deploy]
startCommand = "npm run start:web"
```

**apps/api/railway.toml:**
```toml
[build]
buildCommand = "cd ../.. && npm run build:api"

[deploy]
startCommand = "npm run start:api"
```

---

## Pattern 5: Scheduled Tasks / Cron

For periodic jobs.

### Architecture
```
┌─────────────┐
│   Cron Job  │──────▶ Runs on schedule
│  (Service)  │
└─────────────┘
```

### Implementation

**Option 1: Node.js with node-cron**
```javascript
import cron from 'node-cron';

// Run every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running hourly task');
  await doWork();
});

// Keep process alive
process.stdin.resume();
```

**Option 2: Separate cron service**
```
# Deploy as service that runs periodically
# Use Railway's restart policy
```

---

## Pattern 6: Static Site + API

JAMstack architecture.

### Architecture
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Static    │────▶│     API     │────▶│  Database   │
│   (Vite)    │     │  (Express)  │     │ (Postgres)  │
└─────────────┘     └─────────────┘     └─────────────┘
     CDN              Public             Private
```

### Frontend Build
```toml
# railway.toml
[build]
buildCommand = "npm run build"

[deploy]
startCommand = "npx serve dist -l $PORT"
```

---

## Production Checklist

### Before Going Live

```
□ Environment variables set (not hardcoded)
□ DATABASE_URL using reference variables
□ PORT not hardcoded
□ Health check endpoint implemented
□ Error handling in place
□ Logging configured
□ Secrets not in code
□ CORS configured correctly
□ Rate limiting (if public API)
□ SSL handled (Railway automatic for *.railway.app)
```

### Performance

```
□ Database connection pooling
□ Redis for caching (if needed)
□ Appropriate resource allocation
□ Build optimization
□ Static assets optimized
```

### Monitoring

```
□ Health checks configured
□ Log aggregation
□ Error tracking (Sentry, etc.)
□ Uptime monitoring
```

---

## Service Communication Matrix

| From | To | Use |
|------|-----|-----|
| Frontend | Backend | Public domain (HTTPS) |
| Backend | Database | DATABASE_URL reference |
| Service | Service (internal) | Private domain (HTTP) |
| Service | External API | HTTPS |
| Worker | Queue | REDIS_URL reference |

---

## Environment Variable Patterns

### Per-Environment Config
```
# Production
NODE_ENV=production
LOG_LEVEL=error
DEBUG=false

# Staging
NODE_ENV=staging
LOG_LEVEL=debug
DEBUG=true
```

### Service References
```
# Database
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Cache
REDIS_URL=${{Redis.REDIS_URL}}

# Internal services
USERS_API=http://${{users-api.RAILWAY_PRIVATE_DOMAIN}}:3000

# External services (frontend)
NEXT_PUBLIC_API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}
```

---

## Common Architectures by Framework

### Next.js Full Stack
```
Next.js (API Routes + Frontend) → Postgres
Single service, DATABASE_URL reference
```

### React + Express
```
React (Frontend) → Express (API) → Postgres
Two services + database
```

### Django
```
Django (API + Admin) → Postgres + Redis
Single service + databases
```

### FastAPI + Celery
```
FastAPI (API) → Redis (Broker) → Celery (Workers) → Postgres
Three services + databases
```

---

## Quick Reference

| Pattern | Services | When to Use |
|---------|----------|-------------|
| Frontend + Backend + DB | 3 | Most web apps |
| API + Worker + Queue | 3 | Background processing |
| Microservices | 4+ | Large scale apps |
| Monorepo | 2+ | Shared codebase |
| Cron Jobs | 1 | Scheduled tasks |
| Static + API | 2 | JAMstack |
