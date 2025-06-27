#!/bin/bash

echo "🚀 Starting MMT Electron App (detached)..."

# Start Vite in background
echo "📦 Starting Vite dev server..."
cd /Users/danielseltzer/code/mmt
nohup pnpm --filter @mmt/electron-renderer dev > /tmp/mmt-vite.log 2>&1 &
VITE_PID=$!
echo "Vite PID: $VITE_PID"

# Wait for Vite to be ready
echo "Waiting for Vite to start..."
sleep 3

# Start Electron detached
echo "🖥️  Starting Electron app..."
nohup npx electron apps/electron-main/dist/main-simple.js > /tmp/mmt-electron.log 2>&1 &
ELECTRON_PID=$!
echo "Electron PID: $ELECTRON_PID"

echo "
✅ App should now be running independently!

PIDs:
- Vite: $VITE_PID
- Electron: $ELECTRON_PID

To stop the app:
  kill $VITE_PID $ELECTRON_PID

Logs:
- Vite: /tmp/mmt-vite.log
- Electron: /tmp/mmt-electron.log
"