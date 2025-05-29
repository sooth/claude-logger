#!/bin/bash

# Claude Analytics Installer
# One-line install: curl -fsSL https://raw.githubusercontent.com/sooth/claude-logger/main/install.sh | bash

set -e

echo "🚀 Installing Claude Analytics..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Install claude-analytics globally
echo "📦 Installing claude-analytics via npm..."
npm install -g claude-analytics

# Initialize claude-analytics
echo "🔧 Initializing claude-analytics..."
claude-analytics init

echo ""
echo "✅ Claude Analytics installed successfully!"
echo ""
echo "🎯 Next steps:"
echo "1. Open each Claude terminal"
echo "2. Run: claude-analytics start"
echo "3. View stats: claude-analytics dashboard"
echo ""
echo "📚 Documentation: https://github.com/sooth/claude-logger"
echo ""
echo "Happy parallel coding with advanced analytics! 🚀"