#!/usr/bin/env node
/**
 * Fix Next.js 15 params compatibility across all dynamic routes
 * Updates params types from { param: string } to Promise<{ param: string }>
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

function fixParamsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Fix API route handlers
  const apiPatterns = [
    // Fix function parameters
    {
      from: /{ params }: { params: { ([^}]+) } }/g,
      to: '{ params }: { params: Promise<{ $1 }> }'
    },
    // Fix page component props
    {
      from: /{ params: { ([^}]+) } }/g,
      to: '{ params: Promise<{ $1 }> }'
    },
    // Fix direct params usage (need to add await)
    {
      from: /const { ([^}]+) } = params;/g,
      to: 'const { $1 } = await params;'
    }
  ];

  apiPatterns.forEach(pattern => {
    const newContent = content.replace(pattern.from, pattern.to);
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  }
  return false;
}

// Find all dynamic route files
const patterns = [
  'src/app/**/\\[*\\]/route.ts',
  'src/app/**/\\[*\\]/page.tsx',
  'src/app/**/\\[*\\]/\\[*\\]/route.ts',
  'src/app/**/\\[*\\]/\\[*\\]/page.tsx'
];

let totalFixed = 0;

patterns.forEach(pattern => {
  const files = glob.sync(pattern, { cwd: process.cwd() });
  files.forEach(file => {
    try {
      if (fixParamsInFile(file)) {
        totalFixed++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  });
});

console.log(`\n🎉 Fixed ${totalFixed} files for Next.js 15 compatibility`);

// Also install glob if not present
try {
  require('glob');
} catch (e) {
  console.log('\n📦 Installing glob dependency...');
  require('child_process').execSync('npm install --no-save glob', { stdio: 'inherit' });
}