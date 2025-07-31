#!/bin/bash
echo "Running build check..."
npm run build || exit 1
echo "Build completed successfully!"