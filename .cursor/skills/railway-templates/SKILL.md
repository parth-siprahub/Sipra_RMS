# Railway Templates

> Deploy from Railway's 650+ template library

## Activation Triggers

- Deploying databases (Postgres, MySQL, Redis, MongoDB)
- Adding message queues (RabbitMQ, Redis)
- Deploying pre-built services
- Using `deploy-template` tool

---

## Using deploy-template

The `deploy-template` tool deploys services from Railway's template marketplace.

### Syntax
```
deploy-template with description of what you need
```

### Examples
```
"Deploy a Postgres database"
"Deploy Redis for caching"
"Deploy a MongoDB database"
"Deploy RabbitMQ for message queuing"
```

---

## Popular Database Templates

### PostgreSQL
```
deploy-template: "Postgres database"
```

**Variables provided:**
- `DATABASE_URL` - Full connection string
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

**Use in your app:**
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

### MySQL
```
deploy-template: "MySQL database"
```

**Variables provided:**
- `MYSQL_URL` - Full connection string
- `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`

**Use in your app:**
```
DATABASE_URL=${{MySQL.MYSQL_URL}}
```

### MongoDB
```
deploy-template: "MongoDB database"
```

**Variables provided:**
- `MONGO_URL` - Full connection string

**Use in your app:**
```
MONGODB_URI=${{MongoDB.MONGO_URL}}
```

---

## Cache & Queue Templates

### Redis
```
deploy-template: "Redis"
```

**Variables provided:**
- `REDIS_URL` - Full connection string

**Use in your app:**
```
REDIS_URL=${{Redis.REDIS_URL}}
```

**Common uses:**
- Session storage
- Caching
- Rate limiting
- Pub/sub messaging
- Job queues (with Bull/BullMQ)

### RabbitMQ
```
deploy-template: "RabbitMQ"
```

**Variables provided:**
- `RABBITMQ_URL` - AMQP connection string

**Use in your app:**
```
RABBITMQ_URL=${{RabbitMQ.RABBITMQ_URL}}
```

---

## Search & Analytics Templates

### Meilisearch
```
deploy-template: "Meilisearch"
```

Full-text search engine.

### Typesense
```
deploy-template: "Typesense"
```

Typo-tolerant search engine.

### ClickHouse
```
deploy-template: "ClickHouse"
```

Analytics database for OLAP workloads.

---

## Storage Templates

### MinIO
```
deploy-template: "MinIO"
```

S3-compatible object storage.

**Variables provided:**
- `MINIO_ROOT_USER`
- `MINIO_ROOT_PASSWORD`
- Endpoint URL

---

## Application Templates

### n8n
```
deploy-template: "n8n"
```

Workflow automation platform.

### Metabase
```
deploy-template: "Metabase"
```

Business intelligence and analytics.

### Strapi
```
deploy-template: "Strapi"
```

Headless CMS.

### Ghost
```
deploy-template: "Ghost"
```

Publishing platform.

### Uptime Kuma
```
deploy-template: "Uptime Kuma"
```

Self-hosted monitoring tool.

---

## Template Deployment Workflow

### Basic: Add Database to Existing Project
```
1. check-railway-status
2. deploy-template "Postgres database"
3. list-variables (on Postgres service)
4. set-variables (on your app):
   DATABASE_URL=${{Postgres.DATABASE_URL}}
5. deploy
```

### Full Stack: App + Database
```
1. check-railway-status
2. create-project-and-link
3. deploy-template "Postgres database"
4. set-variables:
   NODE_ENV=production
   DATABASE_URL=${{Postgres.DATABASE_URL}}
5. deploy
6. generate-domain
```

### App + Database + Cache
```
1. check-railway-status
2. create-project-and-link
3. deploy-template "Postgres database"
4. deploy-template "Redis"
5. set-variables:
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
6. deploy
7. generate-domain
```

---

## Template Selection Guide

| Need | Template |
|------|----------|
| Relational data | PostgreSQL, MySQL |
| Document storage | MongoDB |
| Caching | Redis |
| Sessions | Redis |
| Job queues | Redis + Bull, RabbitMQ |
| Full-text search | Meilisearch, Typesense |
| File storage | MinIO |
| Analytics DB | ClickHouse |
| Monitoring | Uptime Kuma |
| CMS | Strapi, Ghost |

---

## Connecting Templates to Your App

### Pattern 1: Reference Variable
```
# In your app's environment variables:
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

### Pattern 2: Private Networking
```
# For internal-only access:
DB_HOST=${{Postgres.RAILWAY_PRIVATE_DOMAIN}}
DB_PORT=5432
```

### Pattern 3: Multiple Databases
```
# Primary database
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Read replica (if set up)
DATABASE_REPLICA_URL=${{Postgres-Replica.DATABASE_URL}}

# Cache
REDIS_URL=${{Redis.REDIS_URL}}
```

---

## Template Customization

After deploying a template, you can customize it:

### Changing Database Settings
```
1. list-services → Find database service
2. set-variables (on database service):
   POSTGRES_MAX_CONNECTIONS=200
3. Service restarts with new config
```

### Persistent Storage
Most database templates include persistent volumes by default. Data survives restarts.

---

## Common Template Configurations

### Postgres with Extensions
Some Postgres templates support extensions:
```
# Enable in your migration or connection
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### Redis Persistence
Railway's Redis template typically has persistence enabled:
- AOF (Append Only File) for durability
- RDB snapshots

### MongoDB Replica Set
For production, consider MongoDB Atlas integration or multiple MongoDB instances.

---

## Troubleshooting Templates

### Template not connecting
```
1. list-services → Verify template deployed
2. list-variables → Check connection variables exist
3. Verify reference syntax: ${{ServiceName.VARIABLE}}
```

### Template using too many resources
```
1. Check Railway dashboard for metrics
2. Consider upgrading plan for more resources
3. Optimize queries/usage patterns
```

### Template data disappeared
```
1. Check if volume is attached
2. Verify service wasn't deleted
3. Check deployment logs
```

---

## Browse All Templates

Visit [railway.com/templates](https://railway.com/templates) for:
- 650+ templates
- One-click deployments
- Community contributions
- Official Railway templates

---

## Quick Reference

| I want... | Template |
|-----------|----------|
| SQL database | `Postgres` or `MySQL` |
| NoSQL database | `MongoDB` |
| Cache | `Redis` |
| Message queue | `RabbitMQ` or `Redis` |
| Search | `Meilisearch` |
| Object storage | `MinIO` |
| Monitoring | `Uptime Kuma` |
