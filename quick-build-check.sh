#!/bin/bash
echo "Starting build check..."
npm run build 2>&1 | while IFS= read -r line; do
    if [[ $line == *"Type error:"* ]] || [[ $line == *"Failed to compile"* ]] || [[ $line == *"Compiled successfully"* ]]; then
        echo "$line"
        if [[ $line == *"Type error:"* ]]; then
            # Print next 10 lines after error
            for i in {1..10}; do
                IFS= read -r nextline && echo "$nextline"
            done
        fi
    fi
done