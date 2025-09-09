# Cloudflare Pages Deployment Guide

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Install globally with `npm install -g wrangler`
3. **Authentication**: Run `wrangler login` to authenticate with Cloudflare

## Deployment Methods

### Method 1: Git Integration (Recommended)

1. **Connect Repository**:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to Pages → Create a project
   - Connect your Git repository (GitHub, GitLab, etc.)

2. **Build Settings**:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (leave empty if project is in root)

3. **Environment Variables**:
   Add these in Cloudflare Pages settings:
   ```
   NODE_ENV=production
   VITE_SUPABASE_URL=https://ezdmasftbvaohoghiflo.supabase.co
   VITE_SUPABASE_ANON_KEY=your_actual_anon_key
   ```

### Method 2: Direct Upload via CLI

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy using Wrangler**:
   ```bash
   npm run deploy
   ```

   Or manually:
   ```bash
   wrangler pages deploy dist --project-name honestinvoice
   ```

## Configuration Features

### Security Headers
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy for camera, microphone, geolocation

### Performance Optimizations
- Long-term caching for static assets (1 year)
- Immutable cache headers for versioned assets
- Proper SPA routing with fallback to index.html

### Custom Domain Setup

1. **Add Custom Domain**:
   - In Cloudflare Pages → Your project → Custom domains
   - Add your domain (e.g., `honestinvoice.com`)

2. **DNS Configuration**:
   - Add CNAME record pointing to your Pages URL
   - Or use Cloudflare as your DNS provider for automatic setup

3. **SSL/TLS**:
   - Automatically provided by Cloudflare
   - Force HTTPS redirects are enabled

## Environment-Specific Deployments

### Production
```bash
wrangler pages deploy dist --project-name honestinvoice --env production
```

### Preview/Staging
```bash
npm run deploy:preview
```

## Monitoring and Analytics

1. **Web Analytics**: Enable in Cloudflare Dashboard → Analytics
2. **Real User Monitoring**: Available in Pro plans
3. **Performance Insights**: Built-in performance metrics

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check Node.js version compatibility
   - Ensure all dependencies are in package.json
   - Verify environment variables are set

2. **Routing Issues**:
   - Ensure SPA redirect is configured (`/* → /index.html`)
   - Check that all routes are client-side routes

3. **Environment Variables**:
   - Must be prefixed with `VITE_` for Vite
   - Set in Cloudflare Pages dashboard, not in code

### Performance Tips

1. **Asset Optimization**:
   - Images are automatically optimized by Cloudflare
   - Use WebP format when possible
   - Implement lazy loading for images

2. **Caching Strategy**:
   - Static assets cached for 1 year
   - HTML files cached briefly for updates
   - Use cache-busting for critical updates

## Next Steps

1. Set up your Cloudflare account
2. Connect your repository or use CLI deployment
3. Configure environment variables
4. Set up custom domain (optional)
5. Enable analytics and monitoring

Your HonestInvoice app will be deployed with:
- Global CDN distribution
- Automatic HTTPS
- DDoS protection
- High availability
- Fast build and deployment times