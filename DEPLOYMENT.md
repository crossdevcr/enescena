# Deployment Guide - Enescena Platform

This document outlines the deployment strategy and setup for the Enescena platform using Vercel.

## 🏗️ Architecture Overview

```
Production:    main branch    → https://enescena.live
Staging:       staging branch → https://staging.enescena.live  
Development:   feature/*      → https://feature-xyz.vercel.app (auto-preview)
```

## 🚀 Initial Vercel Setup

### 1. Prerequisites
- Vercel account connected to GitHub
- Domain `enescena.live` configured in Route 53
- Database provider account (Neon recommended)
- AWS account with Cognito and SES configured

### 2. Vercel Project Setup
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from staging branch first
vercel --prod
```

### 3. Database Setup Options

#### Option A: Neon (Recommended)
- Create production database: `enescena-prod`
- Create staging database: `enescena-staging`
- Connection pooling enabled by default
- Automatic backups

#### Option B: Supabase
- Similar setup with prod/staging projects
- Additional auth features available

#### Option C: AWS RDS
- Requires VPC configuration for Vercel
- More complex but stays in AWS ecosystem

## 🔧 Environment Configuration

### Vercel Dashboard Setup
1. Go to Project Settings → Environment Variables
2. Configure for each environment:

**Production Environment:**
```
DATABASE_URL=postgresql://prod-connection-string
NEXT_PUBLIC_APP_URL=https://enescena.live
AWS_REGION=us-east-1
# ... other production variables
```

**Preview Environment (Staging):**
```
DATABASE_URL=postgresql://staging-connection-string  
NEXT_PUBLIC_APP_URL=https://staging.enescena.live
# ... other staging variables
```

**Development Environment:**
```
DATABASE_URL=postgresql://dev-connection-string
# ... other development variables
```

## 🌐 Domain Configuration

### Route 53 DNS Setup
```
# Production
Type: CNAME
Name: enescena.live
Value: cname.vercel-dns.com

# Staging  
Type: CNAME
Name: staging.enescena.live
Value: cname.vercel-dns.com
```

### Vercel Domain Configuration
1. Go to Project Settings → Domains
2. Add custom domains:
   - `enescena.live` (Production - main branch)
   - `staging.enescena.live` (Preview - staging branch)

## 📋 Deployment Workflow

### Branch Strategy
```bash
# Production deployment
git checkout main
git merge staging  # After staging testing
git push origin main  # Auto-deploys to enescena.live

# Staging deployment  
git checkout staging
git merge feature/your-feature
git push origin staging  # Auto-deploys to staging.enescena.live

# Feature preview
git push origin feature/your-feature  # Auto-creates preview URL
```

### Database Migrations
```bash
# Production migration
DATABASE_URL="production-url" npx prisma db push

# Staging migration
DATABASE_URL="staging-url" npx prisma db push  
```

## 🔒 Security Checklist
- [ ] Environment variables configured per environment
- [ ] Database connections use SSL
- [ ] JWT secrets are unique per environment
- [ ] AWS IAM permissions follow least privilege
- [ ] Staging environment uses separate AWS resources
- [ ] Domain SSL certificates auto-managed by Vercel

## 📊 Monitoring & Logs
- Vercel Analytics: Built-in performance monitoring
- Function logs: Available in Vercel dashboard
- Database monitoring: Through your database provider
- Custom monitoring: Consider adding Sentry or similar

## 🚨 Rollback Strategy
- Vercel deployments are immutable
- Instant rollback via Vercel dashboard
- Database migrations require manual rollback
- Keep staging environment for testing rollbacks

## 📝 Environment Variables Reference
See `.env.example` for complete list of required environment variables.