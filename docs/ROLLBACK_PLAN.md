# RMS Production Rollback Plan

## Quick Reference

| Step | Command |
|------|---------|
| Revert last merge | `git revert -m 1 HEAD --no-edit && git push origin master` |
| Check health | `curl -s https://rms.siprahub.com/api/health` |
| Check PM2 logs | `pm2 logs rms-backend --lines 50` |

---

## When to Roll Back

Trigger rollback if **any** of these occur within 15 minutes of a production deploy:

- `GET /api/health` returns non-200
- Login page fails (Supabase auth error in browser console)
- Blank white screen on any main page
- Backend PM2 process crashes (`pm2 status` shows `errored`)

---

## Rollback Steps

### 1. Revert the merge commit on master

```bash
git checkout master
git pull origin master
git log --oneline -3          # find the bad merge commit hash
git revert -m 1 <merge-hash> --no-edit
git push origin master
```

Azure auto-pulls from master — the revert will deploy automatically within ~60 seconds.

### 2. Verify recovery

```bash
curl -s https://rms.siprahub.com/api/health
# Expected: {"status": "ok", "db": "connected"}
```

---

## Database Rollbacks

### Migration 014 — `resource_requests.notes` column (nullable TEXT)
Safe to leave. No data loss from keeping it. To remove:
```sql
ALTER TABLE resource_requests DROP COLUMN IF EXISTS notes;
```

### Migration 015 — Employee `source` backfill (3 rows)
Safe to leave. Corrected bad data from initial import.

### Migrations 012/013 — RLS analytics + search_path
Safe to leave. Only tightens security; nothing breaks if left.

---

## Contacts / Escalation

- **Solo dev:** Parth P — no escalation path needed
- **DB:** Supabase Dashboard → `https://supabase.com/dashboard`
- **Hosting:** Azure App Service → Azure Portal

---

*Last updated: 2026-04-24 | Branch: dashboard → master*
