#!/bin/bash

# Test script for remote machine deployment
# Run this after installing on a new machine

echo "🧪 Testing Claude Analytics on remote machine..."

# Test basic installation
echo "1️⃣ Testing basic installation..."
if command -v claude-analytics &> /dev/null; then
    echo "✅ claude-analytics command found"
    claude-analytics --help | head -3
else
    echo "❌ claude-analytics command not found"
    exit 1
fi

# Test wrapper installation
echo ""
echo "2️⃣ Testing claude-logged wrapper..."
if command -v claude-logged &> /dev/null; then
    echo "✅ claude-logged wrapper found"
else
    echo "⚠️  claude-logged wrapper not found (will be created during init)"
fi

# Test basic stats (should work without data)
echo ""
echo "3️⃣ Testing stats command..."
if claude-analytics stats 2>/dev/null; then
    echo "✅ Stats command works"
else
    echo "⚠️  Stats command needs initialization"
fi

# Test sync status (should show not logged in)
echo ""
echo "4️⃣ Testing sync status..."
claude-analytics status

# Test server connection if specified
if [ ! -z "$CLAUDE_SYNC_SERVER" ]; then
    echo ""
    echo "5️⃣ Testing server connection..."
    echo "Server: $CLAUDE_SYNC_SERVER"
    
    if curl -s "$CLAUDE_SYNC_SERVER" >/dev/null; then
        echo "✅ Server is reachable"
    else
        echo "❌ Server is not reachable"
    fi
fi

echo ""
echo "🎯 Next steps:"
echo "1. Run 'claude-analytics init' to set up logging"
echo "2. Use 'claude-logged' instead of 'claude' for sessions"
echo "3. Run 'claude-analytics login' to set up sync (optional)"
echo ""
echo "📖 See README-DEV-BUILD.md for complete documentation"