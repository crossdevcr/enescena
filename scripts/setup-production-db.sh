#!/bin/bash

echo "🗄️  Setting up Production Database..."

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
  echo "❌ .env.production file not found!"
  echo "Please create .env.production with your Neon production DATABASE_URL"
  exit 1
fi

# Load production environment
export $(grep -v '^#' .env.production | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ] || [ "$DATABASE_URL" = "PASTE_YOUR_PRODUCTION_CONNECTION_STRING_HERE" ]; then
  echo "❌ DATABASE_URL not set in .env.production"
  echo "Please update .env.production with your actual Neon connection string"
  exit 1
fi

echo "🔄 Running Prisma migrations..."
pnpm prisma migrate deploy

echo "🌱 Seeding database..."
pnpm db:seed

echo "✅ Production database setup complete!"
echo "📊 Database URL: ${DATABASE_URL}"