// scripts/postbuild-headers.cjs
// Copies _headers to dist/ after build for Cloudflare Pages custom headers
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../_headers');
const dest = path.join(__dirname, '../dist/_headers');

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
  console.log('Copied _headers to dist/');
} else {
  console.warn('_headers file not found, custom headers may not work.');
}
