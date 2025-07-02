#!/bin/bash

echo "=== Coolify PostgreSQL Database Connection Finder ==="
echo "Database: postgresql-database-ksc80soo8ks8000gcsk0ccw8"
echo ""

# Check if we can access Coolify via Docker
echo "Checking Docker containers..."
docker ps | grep -E "(coolify|postgres)" || echo "No Docker containers found"

echo ""
echo "Checking for Coolify configuration files..."
find /etc /opt /var -name "*coolify*" -type f 2>/dev/null | head -10

echo ""
echo "Looking for database connection environment variables..."
env | grep -E "(DATABASE|DB_|POSTGRES|PG_)" | sort

echo ""
echo "Checking network connections to PostgreSQL..."
netstat -tuln | grep -E "(5432|postgres)" || ss -tuln | grep -E "(5432|postgres)"

echo ""
echo "Instructions for finding connection info in Coolify UI:"
echo "1. Open Coolify dashboard in browser"
echo "2. Navigate to the PostgreSQL service (postgresql-database-ksc80soo8ks8000gcsk0ccw8)"
echo "3. Look for these sections:"
echo "   - 'Connection' or 'Connection String' tab"
echo "   - 'Environment Variables' section"
echo "   - 'Internal URL' or 'Internal Connection String'"
echo "   - Any section showing host/port/database/username/password"
echo ""
echo "The internal connection string format should be:"
echo "postgresql://user:password@postgresql-database-ksc80soo8ks8000gcsk0ccw8:5432/dbname"
echo ""
echo "Or for external connections:"
echo "postgresql://user:password@host-ip:port/dbname"