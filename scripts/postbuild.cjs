// scripts/postbuild.cjs
// Copies _redirects to dist/ after build for Cloudflare Pages SPA routing
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../_redirects');
const dest = path.join(__dirname, '../dist/_redirects');

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
  console.log('Copied _redirects to dist/');
} else {
  console.warn('_redirects file not found, SPA routing may not work.');
}
