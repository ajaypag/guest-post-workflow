#!/bin/bash
echo "Starting Guest Post Workflow Manager..."
echo ""
echo "The server will be available at:"
echo "  - http://localhost:3000"
echo "  - http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "If localhost doesn't work, try the IP address above"
echo ""
npm run dev