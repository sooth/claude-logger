#!/bin/bash

# Claude Logger Installer
# One-line install: curl -fsSL https://raw.githubusercontent.com/daiokawa/claude-logger/main/install.sh | bash

set -e

echo "🚀 Installing Claude Logger..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Install claude-logger globally
echo "📦 Installing claude-logger via npm..."
npm install -g claude-logger

# Initialize claude-logger
echo "🔧 Initializing claude-logger..."
claude-logger init

echo ""
echo "✅ Claude Logger installed successfully!"
echo ""
echo "🎯 Next steps:"
echo "1. Open each Claude terminal"
echo "2. Run: claude-logger start"
echo "3. View stats: claude-logger dashboard"
echo ""
echo "📚 Documentation: https://github.com/daiokawa/claude-logger"
echo ""
echo "Happy parallel coding! 🚀"