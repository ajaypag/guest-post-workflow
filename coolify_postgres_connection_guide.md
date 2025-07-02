# Coolify PostgreSQL Connection Guide

## Database Information
- **Container Name**: `postgresql-database-ksc80soo8ks8000gcsk0ccw8`
- **Default Port**: 5432

## Where to Find Connection Information in Coolify

### 1. In the Coolify Dashboard:
Navigate to your PostgreSQL service and look for these sections:

- **"Connection" Tab**: Usually contains the full connection string
- **"Environment Variables" Section**: Contains individual connection parameters
- **"Internal URL" or "Internal Connection String"**: For Docker-to-Docker connections
- **"External URL" or "Public Connection String"**: For connections from outside Docker

### 2. Common Connection String Formats:

#### Internal (Docker-to-Docker) Connection:
```
postgresql://username:password@postgresql-database-ksc80soo8ks8000gcsk0ccw8:5432/database_name
```

#### Alternative Internal Formats Coolify Might Use:
```
# Using service name
postgresql://username:password@postgres:5432/database_name

# Using container name
postgresql://username:password@postgresql-database-ksc80soo8ks8000gcsk0ccw8.coolify:5432/database_name

# Using Docker network alias
postgresql://username:password@db:5432/database_name
```

#### External Connection (from host):
```
postgresql://username:password@localhost:mapped_port/database_name
```

## Common Issues and Solutions

### DNS Resolution Error
If you're getting "could not translate host name" errors, try:

1. **Use the container IP directly**:
   ```bash
   docker inspect postgresql-database-ksc80soo8ks8000gcsk0ccw8 | grep IPAddress
   ```
   Then use: `postgresql://username:password@172.x.x.x:5432/database_name`

2. **Check Docker network**:
   ```bash
   docker network ls
   docker inspect <network_name>
   ```

3. **Use localhost with mapped port**:
   If Coolify exposes the database on a host port, use:
   ```
   postgresql://username:password@localhost:5432/database_name
   ```

## Environment Variables to Look For

In Coolify, these environment variables typically contain connection info:

- `DATABASE_URL`
- `POSTGRES_CONNECTION_STRING`
- `DB_HOST` / `DATABASE_HOST`
- `DB_PORT` / `DATABASE_PORT`
- `DB_NAME` / `DATABASE_NAME` / `POSTGRES_DB`
- `DB_USER` / `DATABASE_USER` / `POSTGRES_USER`
- `DB_PASSWORD` / `DATABASE_PASSWORD` / `POSTGRES_PASSWORD`

## Steps to Find Connection Info in Coolify UI

1. **Login to Coolify Dashboard**
2. **Navigate to your PostgreSQL service** (postgresql-database-ksc80soo8ks8000gcsk0ccw8)
3. **Check these locations** (in order):
   - Main service page (might show connection string directly)
   - "Connection" or "Database" tab
   - "Environment Variables" section
   - "Logs" section (sometimes shows connection info on startup)
   - "Settings" or "Configuration" section

## Testing the Connection

Once you find the connection string, test it:

```bash
# Using psql
psql "postgresql://username:password@host:port/database_name"

# Using Docker
docker exec -it your-app-container psql "postgresql://..."

# Using a simple Node.js test
node -e "const { Client } = require('pg'); const client = new Client({ connectionString: 'postgresql://...' }); client.connect().then(() => { console.log('Connected!'); client.end(); }).catch(err => console.error('Error:', err));"
```

## What Coolify Should Provide

Coolify MUST provide at least one of these:
1. A complete connection string (internal or external)
2. Individual connection parameters (host, port, database, username, password)
3. Environment variables containing the connection information
4. A "copy connection string" button or similar feature

Look for any UI elements like:
- Copy buttons (📋)
- "Show connection details" links
- "View credentials" buttons
- Expandable sections with connection info