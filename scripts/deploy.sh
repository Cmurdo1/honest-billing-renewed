#!/bin/bash

# HonestInvoice Vercel Deployment Script
set -euo pipefail

echo "🚀 Deploying HonestInvoice to Vercel..."

# Ensure Vercel project is linked and envs are pulled (requires prior 'vercel login' and 'vercel link')
echo "🔗 Pulling Vercel environment (production)"
npx vercel pull --yes --environment=production >/dev/null || true

# Build the project locally (Vite -> dist)
echo "📦 Building project..."
npm run build

# Deploy the prebuilt output to production
# --prebuilt uses the existing dist folder instead of building in Vercel
# --yes to skip prompts; requires an already linked project
echo "🌐 Deploying to Vercel (production)..."
npx vercel deploy --prod --prebuilt --yes

echo "✅ Deployment complete!"
echo "🔗 Your HonestInvoice app is now live on Vercel"