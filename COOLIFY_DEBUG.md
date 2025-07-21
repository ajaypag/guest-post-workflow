# Coolify Container File Check Commands

Run these commands in the Coolify container terminal:

## 1. Check the root directory structure
```bash
ls -la /app/
```

## 2. Find where the .next directory is
```bash
find /app -name ".next" -type d 2>/dev/null | head -10
```

## 3. Look for the standalone server
```bash
find /app -name "server.js" -type f 2>/dev/null | head -10
```

## 4. Check if there's a pages directory (for pages router)
```bash
find /app -name "pages" -type d 2>/dev/null | head -10
```

## 5. Check for the app directory in various locations
```bash
ls -la /app/.next/standalone/app/ 2>/dev/null || echo "Not in standalone"
ls -la /app/.next/server/app/ 2>/dev/null || echo "Not in server"
ls -la /app/src/app/ 2>/dev/null || echo "Not in src"
```

## 6. Find any bulk-qualification files
```bash
find /app -name "*bulk-qualification*" -type f 2>/dev/null | head -20
```

## 7. Check the Next.js build manifest
```bash
cat /app/.next/routes-manifest.json 2>/dev/null | grep -A5 -B5 "bulk" || echo "No routes manifest found"
```

## 8. Check what's in the standalone directory
```bash
ls -la /app/.next/standalone/ 2>/dev/null || echo "No standalone directory"
```

## 9. Look for the actual Next.js server chunks
```bash
find /app/.next -name "*bulk-qualification*" 2>/dev/null | head -20
```

## 10. Check the app router manifest
```bash
cat /app/.next/app-path-routes-manifest.json 2>/dev/null | grep -A2 -B2 "bulk" || echo "No app routes manifest"
```

## Common Next.js Standalone Structure:
- `/app/.next/standalone/` - The standalone build output
- `/app/.next/server/app/` - Server-side app routes
- `/app/.next/static/` - Static assets
- `/app/node_modules/` - Dependencies (if included)

## If files are missing, check:
1. Build logs for errors
2. Dockerfile to see what's being copied
3. next.config.js for output configuration