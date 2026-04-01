# Railway MCP Tools Expert

> **HIGHEST PRIORITY SKILL** - Expert guide for using Railway MCP Server tools effectively

## Activation Triggers

- Deploying projects to Railway
- Managing Railway services
- Working with Railway infrastructure
- Using Railway MCP tools
- Any Railway-related operations

---

## Available MCP Tools

The Railway MCP Server (`@railway/mcp-server`) provides these tools:

### Status & Authentication
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `check-railway-status` | Verify CLI installed & logged in | **ALWAYS call first** before any operation |

### Project Management
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `list-projects` | List all Railway projects | Finding existing projects |
| `create-project-and-link` | Create new project + link to directory | Starting fresh deployments |

### Service Management
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `list-services` | List services in current project | Discovering project structure |
| `link-service` | Link service to current directory | Connecting code to existing service |
| `deploy` | Deploy current directory | Pushing code to Railway |
| `deploy-template` | Deploy from template library | Adding databases, Redis, etc. |

### Environment Management
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `create-environment` | Create new environment (staging, dev) | Multi-environment setups |
| `link-environment` | Switch to different environment | Changing deployment target |

### Configuration & Variables
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `list-variables` | Show environment variables | Checking current config |
| `set-variables` | Set environment variables | Configuring services |
| `generate-domain` | Generate *.railway.app domain | Making service publicly accessible |

### Monitoring
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `get-logs` | Get build/deployment logs | Debugging failures |

---

## Critical Workflow Patterns

### Pattern 1: First-Time Deployment

```
1. check-railway-status     → Verify logged in
2. create-project-and-link  → Create new project
3. set-variables            → Set required env vars
4. deploy                   → Push code
5. generate-domain          → Make it accessible
```

### Pattern 2: Deploy to Existing Project

```
1. check-railway-status     → Verify logged in
2. list-projects            → Find project
3. link-service             → Connect to service
4. deploy                   → Push code
```

### Pattern 3: Add Database to Project

```
1. check-railway-status     → Verify logged in
2. deploy-template          → Deploy Postgres/MySQL/etc
3. list-variables           → Get DATABASE_URL
4. set-variables            → Add to your service
```

### Pattern 4: Debug Failed Deployment

```
1. check-railway-status     → Verify logged in
2. get-logs                 → Check build logs
3. list-variables           → Verify env vars
4. (fix issue)
5. deploy                   → Retry
```

---

## Tool-Specific Gotchas

### `check-railway-status`
**ALWAYS call this first!** Every workflow should start here.

```
✅ Do: Call before any Railway operation
❌ Don't: Skip this - you'll get confusing errors if not logged in
```

### `deploy`
The deploy tool pushes your current directory.

```
✅ Do: Ensure you're in the correct directory
✅ Do: Have a valid Dockerfile, nixpacks.toml, or supported language
❌ Don't: Deploy from parent directory expecting subdirectory
```

### `deploy-template`
Templates are searched by keyword. Be specific.

```
✅ Good: "Deploy a Postgres database"
✅ Good: "Deploy Redis for caching"
❌ Vague: "Deploy a database" (which one?)
```

**Popular templates:**
- `Postgres` - PostgreSQL database
- `MySQL` - MySQL database  
- `Redis` - Redis cache/queue
- `MongoDB` - MongoDB database
- `RabbitMQ` - Message queue
- `MinIO` - S3-compatible storage

### `set-variables`
Variables are set as key=value pairs.

```
✅ Do: set-variables with {"NODE_ENV": "production", "API_KEY": "xxx"}
❌ Don't: Forget PORT - Railway sets this automatically!
```

**Critical:** Never hardcode PORT. Railway assigns it dynamically.

### `generate-domain`
Creates a `*.railway.app` subdomain.

```
✅ Do: Call after successful deployment
✅ Do: Use for public-facing services
❌ Don't: Generate domain for internal-only services
```

### `get-logs`
Returns build or deployment logs.

```
✅ Do: Use to diagnose build failures
✅ Do: Check for missing dependencies, build errors
❌ Don't: Expect real-time streaming (it's a snapshot)
```

**CLI v4.9.0+ features:**
- `lines` parameter to limit output
- `filter` parameter to search logs

---

## Common Mistakes & Fixes

### Mistake 1: Deploying without checking status
```
❌ Wrong: deploy immediately
✅ Fix: check-railway-status → then deploy
```

### Mistake 2: Hardcoding PORT
```
❌ Wrong: set-variables PORT=3000
✅ Fix: Let Railway assign PORT, read from process.env.PORT
```

### Mistake 3: Wrong database connection
```
❌ Wrong: Manually constructing connection string
✅ Fix: Use DATABASE_URL from list-variables after deploy-template
```

### Mistake 4: Deploying without linking
```
❌ Wrong: deploy to wrong project
✅ Fix: list-projects → link-service → deploy
```

### Mistake 5: Missing environment variables
```
❌ Wrong: Deploy then wonder why app crashes
✅ Fix: set-variables BEFORE deploy
```

---

## Decision Tree: Which Tool to Use?

```
Starting fresh?
├─ Yes → create-project-and-link
└─ No → list-projects → link-service

Need a database?
└─ deploy-template (Postgres, MySQL, Redis, etc.)

Need to configure?
├─ Check current: list-variables
└─ Set new: set-variables

Need public URL?
└─ generate-domain

Something broken?
└─ get-logs

Switching environments?
├─ Create new: create-environment
└─ Switch to existing: link-environment
```

---

## Environment Variable Patterns

### For Web Apps
```
NODE_ENV=production
# PORT is set automatically by Railway!
```

### For Database Connections
```
# After deploy-template Postgres:
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

### For Service-to-Service
```
# Reference another service's variable:
API_URL=${{api-service.RAILWAY_PUBLIC_DOMAIN}}
```

---

## Quick Reference Card

| I want to... | Use this tool |
|--------------|---------------|
| Start new project | `create-project-and-link` |
| Deploy my code | `deploy` |
| Add Postgres | `deploy-template` |
| Set env vars | `set-variables` |
| Get public URL | `generate-domain` |
| Debug failure | `get-logs` |
| Check status | `check-railway-status` |
| See all projects | `list-projects` |
| See all services | `list-services` |

---

## Example: Full Stack Deployment

**Prompt:** "Deploy my Next.js app with a Postgres database"

**Tool Sequence:**
1. `check-railway-status` - Verify logged in
2. `create-project-and-link` - Create project
3. `deploy-template` with "Postgres" - Add database
4. `list-variables` - Get DATABASE_URL from Postgres service
5. `set-variables` - Set DATABASE_URL on app service
6. `deploy` - Deploy Next.js app
7. `generate-domain` - Get public URL

**Result:** Full stack app running with connected database!
