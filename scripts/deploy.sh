#!/bin/bash

# HonestInvoice Cloudflare Pages Deployment Script
echo "🚀 Deploying HonestInvoice to Cloudflare Pages..."

# Build the project
echo "📦 Building project..."
npm run build

# Deploy using Wrangler
echo "🌐 Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name=honestinvoice

echo "✅ Deployment complete!"
echo "🔗 Your HonestInvoice app is now live on Cloudflare Pages"