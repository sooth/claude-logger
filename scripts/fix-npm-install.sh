#!/bin/bash

# Fix script for when npm doesn't create the bin symlink properly
# This can happen with certain npm configurations or nvm setups

echo "🔧 Fixing claude-analytics installation..."

# Find npm prefix
NPM_PREFIX=$(npm config get prefix)
echo "📍 npm prefix: $NPM_PREFIX"

# Check if claude-analytics is installed
if ! npm list -g claude-analytics >/dev/null 2>&1; then
    echo "❌ claude-analytics is not installed globally"
    echo "   Run: npm install -g claude-analytics"
    exit 1
fi

# Find the installed package
PACKAGE_DIR="$NPM_PREFIX/lib/node_modules/claude-analytics"
if [ ! -d "$PACKAGE_DIR" ]; then
    echo "❌ Cannot find claude-analytics in $PACKAGE_DIR"
    exit 1
fi

echo "📦 Found package at: $PACKAGE_DIR"

# Check for the executable
EXECUTABLE="$PACKAGE_DIR/bin/claude-logger.js"
if [ ! -f "$EXECUTABLE" ]; then
    echo "❌ Cannot find executable at $EXECUTABLE"
    echo "   Package structure may be incorrect"
    exit 1
fi

# Create bin directory if it doesn't exist
BIN_DIR="$NPM_PREFIX/bin"
if [ ! -d "$BIN_DIR" ]; then
    echo "📁 Creating bin directory: $BIN_DIR"
    mkdir -p "$BIN_DIR"
fi

# Create symlink
SYMLINK="$BIN_DIR/claude-analytics"
if [ -L "$SYMLINK" ]; then
    echo "🔗 Removing existing symlink"
    rm "$SYMLINK"
fi

echo "🔗 Creating symlink: $SYMLINK -> $EXECUTABLE"
ln -s "$EXECUTABLE" "$SYMLINK"
chmod +x "$SYMLINK"

# Verify it works
if [ -x "$SYMLINK" ]; then
    echo "✅ Symlink created successfully"
    
    # Check if bin is in PATH
    if ! echo "$PATH" | grep -q "$BIN_DIR"; then
        echo ""
        echo "⚠️  $BIN_DIR is not in your PATH"
        echo "   Add this to your ~/.bashrc or ~/.zshrc:"
        echo "   export PATH=\"$BIN_DIR:\$PATH\""
    else
        echo ""
        echo "✅ Installation fixed! Try running:"
        echo "   claude-analytics --version"
    fi
else
    echo "❌ Failed to create symlink"
    exit 1
fi