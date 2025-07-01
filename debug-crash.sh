#!/bin/bash

echo "🔍 Debug crash detection script"
echo "Run this when the server crashes to capture debug info"
echo "============================================="

cd "/home/ajay/guest post workflow/guest-post-workflow"

echo "📊 Current process status:"
ps aux | grep -E "(next|node)" | grep -v grep

echo ""
echo "🌐 Port status:"
netstat -tlnp | grep 3000 || echo "Port 3000 not in use"

echo ""
echo "📝 Recent server logs (last 50 lines):"
if [ -f "dev.log" ]; then
    tail -50 dev.log
else
    echo "No dev.log found"
fi

echo ""
echo "🔧 System resources:"
free -h
df -h .

echo ""
echo "⚠️  Recent system errors:"
dmesg | tail -5

echo ""
echo "🐛 Check for zombie processes:"
ps aux | awk '$8 ~ /^Z/ { print $2, $11 }' | head -5

echo ""
echo "📋 Environment info:"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Working directory: $(pwd)"

echo ""
echo "🔄 Attempting restart with verbose logging:"
npm run dev