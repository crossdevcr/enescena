#!/usr/bin/env node
/**
 * Database Setup Helper
 * 
 * This script helps configure the database connections for different environments.
 * Run with: node scripts/setup-database.js
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupDatabase() {
  console.log('🗄️  Database Configuration Setup\n');
  
  console.log('Recommended: Neon PostgreSQL (https://neon.tech)');
  console.log('- Serverless PostgreSQL');
  console.log('- Perfect Vercel integration');
  console.log('- Database branching for environments\n');

  const provider = await question('Which database provider are you using? (neon/supabase/aws-rds/other): ');
  
  let prodUrl, stagingUrl, devUrl;
  
  if (provider.toLowerCase() === 'neon') {
    console.log('\n📝 Neon Setup Instructions:');
    console.log('1. Go to https://neon.tech and create account');
    console.log('2. Create project: "enescena-production"');
    console.log('3. Create project: "enescena-staging"');
    console.log('4. Get connection strings from each project dashboard\n');
    
    prodUrl = await question('Production DATABASE_URL (from Neon dashboard): ');
    stagingUrl = await question('Staging DATABASE_URL (from Neon dashboard): ');
    devUrl = stagingUrl; // Use staging for development too
  } else if (provider.toLowerCase() === 'supabase') {
    console.log('\n📝 Supabase Setup Instructions:');
    console.log('1. Go to https://supabase.com and create account');
    console.log('2. Create project: "enescena-production"');
    console.log('3. Create project: "enescena-staging"');
    console.log('4. Get connection strings from Settings → Database\n');
    
    prodUrl = await question('Production DATABASE_URL (from Supabase): ');
    stagingUrl = await question('Staging DATABASE_URL (from Supabase): ');
    devUrl = stagingUrl;
  } else {
    prodUrl = await question('Production DATABASE_URL: ');
    stagingUrl = await question('Staging DATABASE_URL: ');
    devUrl = await question('Development DATABASE_URL (optional, defaults to staging): ') || stagingUrl;
  }

  // Create environment-specific .env files
  const envFiles = {
    '.env.production': `# Production Environment Variables
DATABASE_URL="${prodUrl}"
NEXT_PUBLIC_APP_URL="https://enescena.live"
NODE_ENV="production"`,
    
    '.env.staging': `# Staging Environment Variables  
DATABASE_URL="${stagingUrl}"
NEXT_PUBLIC_APP_URL="https://staging.enescena.live"
NODE_ENV="production"`,
    
    '.env.development': `# Development Environment Variables
DATABASE_URL="${devUrl}"  
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"`
  };

  console.log('\n📁 Creating environment files...');
  
  for (const [filename, content] of Object.entries(envFiles)) {
    fs.writeFileSync(path.join(process.cwd(), filename), content);
    console.log(`✅ Created ${filename}`);
  }

  console.log('\n🔧 Next steps:');
  console.log('1. Add AWS credentials to each .env file');
  console.log('2. Test database connections with: pnpm exec prisma db push');
  console.log('3. Set environment variables in Vercel dashboard');
  console.log('4. Run initial deployment\n');

  console.log('⚠️  Remember: Add .env.* to .gitignore (already done)');
  
  rl.close();
}

setupDatabase().catch(console.error);