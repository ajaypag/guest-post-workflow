#!/bin/bash
set -e

echo "🚀 Starting production server..."

# Run migrations if DATABASE_URL is available
if [ ! -z "$DATABASE_URL" ]; then
    echo "📊 Running database migrations..."
    npm run db:migrate-apply
else
    echo "⚠️ DATABASE_URL not set - skipping migrations"
fi

# Start the Next.js server
echo "🌐 Starting Next.js server..."
npm start