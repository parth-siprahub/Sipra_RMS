# Railway Troubleshooting

> Debug deployment failures and runtime issues

## Activation Triggers

- Deployments failing
- Services crashing
- Connection errors
- Build failures
- Runtime issues

---

## Diagnostic Workflow

When something fails:

```
1. get-logs              → Check build/deploy logs
2. list-variables        → Verify environment variables
3. check-railway-status  → Confirm CLI is working
4. Identify error type   → Use this guide
5. Apply fix             → Redeploy
```

---

## Build Failures

### "Module not found" / "Cannot find module"

**Cause:** Missing dependency

**Fix:**
```
1. Check package.json has the dependency
2. Ensure npm install/yarn install runs in build
3. Check for typos in import statements
```

**Example fix:**
```bash
npm install missing-package
# Then redeploy
```

### "ENOENT: no such file or directory"

**Cause:** File path issue or missing file

**Fix:**
```
1. Check file exists in repository
2. Verify case sensitivity (Linux is case-sensitive!)
3. Check .gitignore isn't excluding needed files
```

### "Out of memory" / "JavaScript heap out of memory"

**Cause:** Build exceeds memory limit

**Fix:**
```
# In package.json scripts:
"build": "NODE_OPTIONS='--max-old-space-size=4096' npm run build"
```

Or upgrade Railway plan for more resources.

### "Permission denied"

**Cause:** File permission issues in Docker

**Fix:**
```dockerfile
# Don't run as root
RUN adduser --disabled-password appuser
USER appuser
```

### "Build timeout"

**Cause:** Build taking too long

**Fix:**
```
1. Optimize build (parallel builds, caching)
2. Remove unnecessary dependencies
3. Use multi-stage Docker builds
```

---

## Runtime Failures

### "Port already in use" / App crashes immediately

**Cause:** Hardcoded PORT

**Fix:**
```javascript
// ❌ Wrong
app.listen(3000);

// ✅ Correct
const port = process.env.PORT || 3000;
app.listen(port);
```

### "ECONNREFUSED" to database

**Cause:** Database connection failing

**Diagnostic:**
```
1. list-variables → Check DATABASE_URL exists
2. Verify database service is running
3. Check reference variable syntax
```

**Fix:**
```
# Ensure correct reference:
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Not a hardcoded string that may be outdated
```

### "Connection timeout"

**Cause:** Service can't reach dependency

**Fixes:**
```
1. Use private networking for internal services:
   http://${{service.RAILWAY_PRIVATE_DOMAIN}}:PORT

2. Check security groups/firewall (external services)

3. Verify target service is running
```

### "Health check failed"

**Cause:** App not responding to health endpoint

**Fixes:**
```
1. Implement health endpoint:
   app.get('/health', (req, res) => res.sendStatus(200));

2. Ensure app starts quickly (< 300s default timeout)

3. Check PORT configuration
```

### "OOMKilled" / Out of memory

**Cause:** App exceeds memory limit

**Fixes:**
```
1. Optimize memory usage
2. Add memory limits to Node.js:
   NODE_OPTIONS='--max-old-space-size=512'
3. Upgrade Railway plan
```

---

## Connection Issues

### "ENOTFOUND" / DNS resolution failed

**Cause:** Can't resolve hostname

**Fixes:**
```
1. Check URL is correct
2. Use RAILWAY_PRIVATE_DOMAIN for internal services
3. Verify service exists and has domain
```

### "ETIMEDOUT"

**Cause:** Connection timing out

**Fixes:**
```
1. Check target service is running
2. Verify network connectivity
3. Check for firewall/security rules
4. Use private networking for internal calls
```

### SSL/TLS errors

**Cause:** Certificate issues

**Fixes:**
```
1. Railway handles SSL automatically for *.railway.app
2. For custom domains, verify DNS + SSL setup
3. For internal services, use http:// (not https://)
```

---

## Environment Variable Issues

### Variable not available

**Diagnostic:**
```
1. list-variables → Check variable exists
2. Verify no typos in variable name
3. Check reference syntax for linked vars
```

**Fix:**
```
set-variables with correct key=value
deploy (to apply changes)
```

### Reference variable empty

**Cause:** Source service doesn't have the variable

**Fix:**
```
1. list-variables on SOURCE service
2. Verify variable name matches exactly
3. Use correct syntax: ${{ServiceName.VARIABLE_NAME}}
```

### Variables not updating

**Cause:** Old deployment still running

**Fix:**
```
1. set-variables with new values
2. deploy → Forces restart with new env
```

---

## Deployment Issues

### "No Dockerfile or buildable code"

**Cause:** Railway can't detect how to build

**Fixes:**
```
1. Add Dockerfile to root
2. Add nixpacks.toml for Nixpacks config
3. Ensure supported language structure
```

### Deployment stuck

**Cause:** Build hanging or infinite loop

**Fixes:**
```
1. Check build logs with get-logs
2. Look for infinite loops in build scripts
3. Cancel and retry deployment
```

### Wrong directory deployed

**Cause:** Linked to wrong service/directory

**Fix:**
```
1. list-services → Find correct service
2. link-service → Link to correct one
3. deploy from correct directory
```

---

## Error Catalog

| Error | Likely Cause | Quick Fix |
|-------|--------------|-----------|
| "Module not found" | Missing dependency | `npm install <package>` |
| "ECONNREFUSED" | DB not connected | Check DATABASE_URL reference |
| "Port in use" | Hardcoded PORT | Use `process.env.PORT` |
| "Health check failed" | No /health endpoint | Add health route |
| "OOMKilled" | Memory exceeded | Optimize or upgrade plan |
| "ENOTFOUND" | Bad hostname | Check service URLs |
| "Permission denied" | Docker permissions | Add non-root user |
| "Build timeout" | Slow build | Optimize build process |

---

## Log Analysis

### Reading Build Logs

```
get-logs → Returns build output
```

**Look for:**
- `npm ERR!` - Node.js/npm errors
- `Error:` - General errors
- `WARN` - Warnings (may indicate issues)
- Exit codes - Non-zero means failure

### Reading Runtime Logs

```
get-logs → Returns application logs
```

**Look for:**
- Stack traces - Show error origin
- Connection errors - Database/service issues
- Crash messages - Why app died

### Log Filtering (CLI v4.9.0+)

```
get-logs with lines=100 filter="error"
```

---

## Debugging Checklist

```
□ get-logs - Check for obvious errors
□ list-variables - Verify env vars set correctly
□ PORT - Not hardcoded, using process.env.PORT
□ DATABASE_URL - Using ${{}} reference syntax
□ Health check - Endpoint exists and responds
□ Dependencies - All installed, correct versions
□ File paths - Case-sensitive, files exist
□ Memory - Not exceeding limits
```

---

## When All Else Fails

### 1. Clean Redeploy
```
1. Delete service
2. create-project-and-link (new project)
3. set-variables
4. deploy
```

### 2. Check Railway Status
Visit [status.railway.app](https://status.railway.app) for platform issues.

### 3. Railway Discord
Join [Railway Discord](https://discord.gg/railway) for community help.

### 4. Documentation
Check [docs.railway.com](https://docs.railway.com) for detailed guides.

---

## Quick Reference

| Symptom | First Check |
|---------|-------------|
| Build fails | `get-logs` → Check build errors |
| App crashes | `get-logs` → Check runtime errors |
| Can't connect to DB | `list-variables` → Check DATABASE_URL |
| No public URL | `generate-domain` |
| Wrong env vars | `list-variables` → `set-variables` |
| Health check fails | Implement `/health` endpoint |
