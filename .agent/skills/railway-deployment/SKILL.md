# Railway Deployment

> Master Railway deployments from code to production

## Activation Triggers

- Deploying applications to Railway
- Fixing deployment failures
- Configuring build settings
- Setting up Dockerfiles or Nixpacks
- Health check configuration

---

## Deployment Methods

Railway supports multiple deployment methods:

| Method | Best For | Auto-detected |
|--------|----------|---------------|
| **Nixpacks** | Most languages (Node, Python, Go, Rust) | ✅ Yes |
| **Dockerfile** | Custom builds, complex dependencies | ✅ Yes |
| **Docker Image** | Pre-built images | Manual |

### Auto-Detection Priority
1. `Dockerfile` in root → Uses Docker
2. `nixpacks.toml` in root → Uses Nixpacks with config
3. Detected language → Uses Nixpacks defaults

---

## Pre-Deployment Checklist

Before calling `deploy`:

```
□ check-railway-status passed
□ In correct directory
□ Environment variables set (set-variables)
□ Build command correct (if custom)
□ Start command correct (if custom)
□ PORT not hardcoded (use process.env.PORT)
```

---

## Nixpacks Configuration

Create `nixpacks.toml` for custom builds:

### Node.js Example
```toml
[phases.setup]
nixPkgs = ["nodejs_20", "npm"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"
```

### Python Example
```toml
[phases.setup]
nixPkgs = ["python311", "pip"]

[phases.install]
cmds = ["pip install -r requirements.txt"]

[start]
cmd = "python app.py"
```

### Go Example
```toml
[phases.setup]
nixPkgs = ["go"]

[phases.build]
cmds = ["go build -o main ."]

[start]
cmd = "./main"
```

---

## Dockerfile Best Practices

### Node.js Production Dockerfile
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Critical: Use Railway's PORT
ENV PORT=3000
EXPOSE $PORT

CMD ["node", "dist/index.js"]
```

### Python Production Dockerfile
```dockerfile
FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Critical: Use Railway's PORT
ENV PORT=8000
EXPOSE $PORT

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "$PORT"]
```

---

## railway.toml Configuration

Create `railway.toml` for Railway-specific settings:

```toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `builder` | `nixpacks` or `dockerfile` | Auto-detected |
| `buildCommand` | Custom build command | Language default |
| `startCommand` | Custom start command | Language default |
| `healthcheckPath` | HTTP path for health checks | None |
| `healthcheckTimeout` | Seconds before timeout | 300 |
| `restartPolicyType` | `ON_FAILURE`, `ALWAYS`, `NEVER` | `ON_FAILURE` |

---

## PORT Configuration

**Critical Rule:** Never hardcode PORT!

```javascript
// ✅ Correct - Node.js
const port = process.env.PORT || 3000;
app.listen(port);
```

```python
# ✅ Correct - Python
import os
port = int(os.environ.get("PORT", 8000))
uvicorn.run(app, host="0.0.0.0", port=port)
```

```go
// ✅ Correct - Go
port := os.Getenv("PORT")
if port == "" {
    port = "8080"
}
http.ListenAndServe(":"+port, nil)
```

---

## Health Checks

### HTTP Health Check
```toml
# railway.toml
[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 300
```

### Implement Health Endpoint
```javascript
// Node.js
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
```

```python
# FastAPI
@app.get("/health")
def health():
    return {"status": "ok"}
```

---

## Deployment Workflow

### First Deployment
```
1. check-railway-status
2. create-project-and-link
3. set-variables (NODE_ENV, API_KEYS, etc.)
4. deploy
5. get-logs (verify success)
6. generate-domain
```

### Subsequent Deployments
```
1. (make code changes)
2. deploy
3. get-logs (verify success)
```

### Rolling Back
Railway keeps deployment history. Use the dashboard to rollback, or:
```
1. git revert <commit>
2. deploy
```

---

## Build Optimization

### Node.js
```dockerfile
# Use .dockerignore
node_modules
.git
*.md
```

```toml
# nixpacks.toml - cache node_modules
[phases.install]
cmds = ["npm ci --prefer-offline"]
```

### Python
```dockerfile
# Install dependencies first (cached layer)
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
```

---

## Common Build Failures

### "Module not found"
```
Cause: Missing dependency
Fix: Check package.json/requirements.txt
```

### "EACCES: permission denied"
```
Cause: File permission issues
Fix: Don't run as root, check file modes
```

### "Out of memory"
```
Cause: Build exceeds memory limit
Fix: Upgrade plan or optimize build
```

### "Port already in use"
```
Cause: Hardcoded PORT
Fix: Use process.env.PORT
```

---

## Monorepo Deployments

For monorepos, set the root directory:

### Using railway.toml
```toml
[build]
watchPatterns = ["apps/api/**"]
```

### Project Structure
```
my-monorepo/
├── apps/
│   ├── web/          # Deploy as service 1
│   └── api/          # Deploy as service 2
├── packages/
│   └── shared/
└── package.json
```

**Deploy each app as separate service:**
1. Create project
2. Link service to `apps/web`
3. Deploy web
4. Create another service
5. Link to `apps/api`
6. Deploy api

---

## Zero-Downtime Deployments

Railway handles this automatically:
1. New deployment starts
2. Health check passes
3. Traffic switches to new deployment
4. Old deployment stops

**Ensure:**
- Health check endpoint exists
- App starts quickly
- Graceful shutdown handling

```javascript
// Graceful shutdown - Node.js
process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
```

---

## Quick Reference

| I want to... | Do this |
|--------------|---------|
| Custom build | Create `nixpacks.toml` or `Dockerfile` |
| Set start command | Add to `railway.toml` |
| Add health check | Set `healthcheckPath` in `railway.toml` |
| Debug build | `get-logs` after failed deploy |
| Deploy monorepo | Create separate services per app |
