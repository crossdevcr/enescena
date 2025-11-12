#!/bin/bash

echo "🗄️  Setting up Staging Database..."

# Check if .env.staging exists
if [ ! -f ".env.staging" ]; then
  echo "❌ .env.staging file not found!"
  echo "Please create .env.staging with your Neon staging DATABASE_URL"
  exit 1
fi

# Load staging environment
export $(grep -v '^#' .env.staging | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ] || [ "$DATABASE_URL" = "PASTE_YOUR_STAGING_CONNECTION_STRING_HERE" ]; then
  echo "❌ DATABASE_URL not set in .env.staging"
  echo "Please update .env.staging with your actual Neon connection string"
  exit 1
fi

echo "🔄 Running Prisma migrations..."
pnpm prisma migrate deploy

echo "🌱 Seeding database..."
pnpm db:seed

echo "✅ Staging database setup complete!"
echo "📊 Database URL: ${DATABASE_URL}"