# Railway Environment

> Environment variables, secrets, and configuration management

## Activation Triggers

- Setting environment variables
- Connecting services to databases
- Managing secrets
- Service-to-service communication
- Reference variables

---

## Critical Gotchas

### ⚠️ PORT is Automatic
**Never set PORT manually!** Railway assigns it dynamically.

```
❌ WRONG: set-variables PORT=3000
✅ RIGHT: Read from process.env.PORT in your code
```

### ⚠️ DATABASE_URL Pattern
After deploying a database template, use the reference variable:

```
❌ WRONG: Manually copying the connection string
✅ RIGHT: DATABASE_URL=${{Postgres.DATABASE_URL}}
```

---

## Setting Variables

Use `set-variables` tool with key-value pairs:

```json
{
  "NODE_ENV": "production",
  "API_KEY": "sk-xxx",
  "DEBUG": "false"
}
```

### Variable Types

| Type | Example | Notes |
|------|---------|-------|
| String | `API_KEY=sk-xxx` | Most common |
| Boolean | `DEBUG=true` | As string, parse in code |
| Number | `MAX_CONNECTIONS=10` | As string, parse in code |
| URL | `API_URL=https://...` | Full URL |
| Reference | `${{Service.VAR}}` | Links to another service |

---

## Reference Variables

Reference another service's variables with `${{}}` syntax:

### Database Connection
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

### Service URLs
```
API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}
REDIS_URL=${{Redis.REDIS_URL}}
```

### Common Reference Patterns

| Service | Variable | Description |
|---------|----------|-------------|
| Postgres | `${{Postgres.DATABASE_URL}}` | Full connection string |
| MySQL | `${{MySQL.MYSQL_URL}}` | Full connection string |
| Redis | `${{Redis.REDIS_URL}}` | Full connection string |
| MongoDB | `${{MongoDB.MONGO_URL}}` | Full connection string |
| Any service | `${{ServiceName.RAILWAY_PUBLIC_DOMAIN}}` | Public domain |
| Any service | `${{ServiceName.RAILWAY_PRIVATE_DOMAIN}}` | Private domain |

---

## Railway-Provided Variables

Railway automatically sets these:

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Assigned port | `3000` |
| `RAILWAY_ENVIRONMENT` | Current environment | `production` |
| `RAILWAY_PROJECT_ID` | Project ID | `abc123` |
| `RAILWAY_SERVICE_ID` | Service ID | `def456` |
| `RAILWAY_PUBLIC_DOMAIN` | Public URL (if generated) | `myapp.railway.app` |
| `RAILWAY_PRIVATE_DOMAIN` | Internal URL | `myapp.railway.internal` |

---

## Service-to-Service Communication

### Public Domain (External)
```
# For external access
API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}
```

### Private Domain (Internal) - Recommended
```
# For internal service communication (faster, no egress costs)
API_URL=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}
```

### Private Networking Example
```
Frontend → Backend (internal)
BACKEND_URL=http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:3000

Backend → Database (internal)
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

---

## Database Patterns

### PostgreSQL
```
# After deploy-template Postgres:
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Individual vars (if needed):
PGHOST=${{Postgres.PGHOST}}
PGPORT=${{Postgres.PGPORT}}
PGUSER=${{Postgres.PGUSER}}
PGPASSWORD=${{Postgres.PGPASSWORD}}
PGDATABASE=${{Postgres.PGDATABASE}}
```

### MySQL
```
DATABASE_URL=${{MySQL.MYSQL_URL}}
# or
MYSQL_URL=${{MySQL.MYSQL_URL}}
```

### Redis
```
REDIS_URL=${{Redis.REDIS_URL}}
```

### MongoDB
```
MONGO_URL=${{MongoDB.MONGO_URL}}
# or
MONGODB_URI=${{MongoDB.MONGO_URL}}
```

---

## Environment-Specific Configuration

### Multi-Environment Setup

```
1. create-environment name="staging"
2. link-environment to staging
3. set-variables (staging-specific values)
4. deploy

5. link-environment to production
6. set-variables (production values)
7. deploy
```

### Environment Variable Patterns

**Staging:**
```
NODE_ENV=staging
DEBUG=true
LOG_LEVEL=debug
```

**Production:**
```
NODE_ENV=production
DEBUG=false
LOG_LEVEL=error
```

---

## Secrets Management

### Best Practices

1. **Never commit secrets** to git
2. **Use Railway variables** for all secrets
3. **Reference shared secrets** via variables
4. **Rotate secrets** by updating variables

### Sensitive Variables
```
# API Keys
STRIPE_SECRET_KEY=sk_live_xxx
OPENAI_API_KEY=sk-xxx

# Secrets
JWT_SECRET=your-256-bit-secret
SESSION_SECRET=random-string

# Credentials
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxx
```

---

## Common Configurations

### Next.js
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

### Express.js
```
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=xxx
```

### Python/FastAPI
```
ENVIRONMENT=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
SECRET_KEY=xxx
```

### Django
```
DJANGO_SETTINGS_MODULE=myapp.settings.production
DATABASE_URL=${{Postgres.DATABASE_URL}}
SECRET_KEY=xxx
ALLOWED_HOSTS=.railway.app
```

---

## Debugging Variables

### Check Current Variables
```
list-variables
```

### Common Issues

**App can't connect to database:**
```
1. list-variables → Check DATABASE_URL exists
2. Verify reference syntax: ${{Postgres.DATABASE_URL}}
3. Ensure database service is deployed
```

**Variables not updating:**
```
1. set-variables with new values
2. deploy → Triggers restart with new vars
```

**Reference variable empty:**
```
1. Check service name matches exactly
2. Verify source service is deployed
3. Check variable name is correct
```

---

## Variable Workflow

### Adding a Database
```
1. deploy-template "Postgres"
2. list-variables (on Postgres service) → See DATABASE_URL
3. set-variables (on app service):
   DATABASE_URL=${{Postgres.DATABASE_URL}}
4. deploy app
```

### Connecting Frontend to Backend
```
1. Deploy backend
2. generate-domain (for backend)
3. list-variables (on backend) → See RAILWAY_PUBLIC_DOMAIN
4. set-variables (on frontend):
   NEXT_PUBLIC_API_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}
5. Deploy frontend
```

---

## Quick Reference

| I want to... | Do this |
|--------------|---------|
| Set env var | `set-variables` with key-value |
| Check vars | `list-variables` |
| Connect to DB | `DATABASE_URL=${{Postgres.DATABASE_URL}}` |
| Internal URL | `${{service.RAILWAY_PRIVATE_DOMAIN}}` |
| Public URL | `${{service.RAILWAY_PUBLIC_DOMAIN}}` |
| Different envs | `create-environment` + `link-environment` |
