#!/bin/bash

echo "Starting Next.js monitoring script..."
cd "/home/ajay/guest post workflow/guest-post-workflow"

# Kill any existing processes
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Start the server and monitor it
echo "Starting Next.js dev server..."
npm run dev > server.log 2>&1 &
SERVER_PID=$!

echo "Server started with PID: $SERVER_PID"
echo "Monitoring for crashes..."

# Monitor the process
while true; do
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        echo "$(date): Server process died! PID $SERVER_PID no longer exists"
        echo "Last 20 lines of server log:"
        tail -20 server.log
        echo "Attempting to restart..."
        npm run dev > server.log 2>&1 &
        SERVER_PID=$!
        echo "Restarted with new PID: $SERVER_PID"
    fi
    
    # Check if server is responding
    if ! curl -s --max-time 5 http://localhost:3000 > /dev/null 2>&1; then
        echo "$(date): Server not responding to HTTP requests"
    fi
    
    sleep 10
done