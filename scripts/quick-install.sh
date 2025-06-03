#!/bin/bash

# Quick install script for remote machines
# Can be piped directly from curl/wget

set -e

echo "🚀 Quick installing Claude Analytics..."

# Create temp directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Download the npm package (you'd host this somewhere)
if [ -z "$1" ]; then
    echo "❌ Usage: ./quick-install.sh <path-to-npm-package>"
    echo "   or: curl -s <url>/quick-install.sh | bash -s <npm-package-url>"
    exit 1
fi

PACKAGE_URL="$1"

# Download package
echo "📦 Downloading package..."
if command -v curl &> /dev/null; then
    curl -L -o claude-analytics.tgz "$PACKAGE_URL"
elif command -v wget &> /dev/null; then
    wget -O claude-analytics.tgz "$PACKAGE_URL"
else
    echo "❌ Need curl or wget to download"
    exit 1
fi

# Install globally
echo "📦 Installing..."
npm install -g claude-analytics.tgz

# Clean up
cd -
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Claude Analytics installed!"
echo ""
echo "🎯 Next steps:"
echo "  1. claude-analytics init     # Set up logging"
echo "  2. claude-logged            # Use instead of 'claude'"
echo "  3. claude-analytics stats   # View usage"
echo ""