#!/bin/bash

# Claude Analytics Client-Only Build Script
# Creates a lightweight package for testing the CLI on other machines

set -e

echo "🚀 Building Claude Analytics client package..."

# Get version and create build directory
VERSION=$(node -p "require('./package.json').version")
BUILD_DIR="dist/claude-analytics-client-${VERSION}"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

echo "📦 Version: ${VERSION}"
echo "🕐 Build: ${TIMESTAMP}"

# Clean and create build directory
rm -rf dist/claude-analytics-client-*
mkdir -p "${BUILD_DIR}"

# Copy only client files (no server)
echo "📂 Copying client files..."
# IMPORTANT: Maintain directory structure for npm bin
mkdir -p "${BUILD_DIR}/bin"
cp bin/claude-logger.js "${BUILD_DIR}/bin/"
cp bin/jsonl-parser.js "${BUILD_DIR}/bin/"

# Copy other necessary files
cp package.json "${BUILD_DIR}/"
cp README.md "${BUILD_DIR}/"
cp COMMANDS.md "${BUILD_DIR}/" 2>/dev/null || true
cp setup-claude-logger.sh "${BUILD_DIR}/"
cp multi-session-logger.sh "${BUILD_DIR}/"
mkdir -p "${BUILD_DIR}/scripts"
cp scripts/setup.js "${BUILD_DIR}/scripts/"
cp scripts/fix-npm-install.sh "${BUILD_DIR}/scripts/" 2>/dev/null || true

# Create minimal package.json for client
cat > "${BUILD_DIR}/package.json" << EOF
{
  "name": "claude-analytics",
  "version": "${VERSION}",
  "description": "Advanced Claude Code analytics with real-time token tracking",
  "main": "index.js",
  "bin": {
    "claude-analytics": "bin/claude-logger.js"
  },
  "scripts": {
    "postinstall": "echo 'Run claude-analytics init to complete setup'"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
EOF

# Create simple install script
echo "⚙️  Creating installation script..."
cat > "${BUILD_DIR}/install.sh" << 'EOF'
#!/bin/bash

echo "🚀 Installing Claude Analytics Client..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not found"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Install globally
echo "📦 Installing claude-analytics..."
npm install -g .

echo ""
echo "✅ Installation complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Run 'claude-analytics init' to set up logging"
echo "2. Use 'claude-logged' instead of 'claude' to track sessions"
echo "3. Run 'claude-analytics stats' to view usage"
echo ""
echo "📊 Available commands:"
echo "  claude-analytics stats      # View usage statistics"
echo "  claude-analytics heatmap    # Token usage patterns"
echo "  claude-analytics timeline   # Session timeline"
echo "  claude-analytics export     # Export data to CSV/JSON"
echo ""
echo "☁️  Optional sync setup:"
echo "  claude-analytics login      # Set up multi-device sync"
echo "  claude-analytics sync       # Upload data to server"
echo ""
EOF

chmod +x "${BUILD_DIR}/install.sh"

# Create test script
echo "🧪 Creating test script..."
cat > "${BUILD_DIR}/test-client.sh" << 'EOF'
#!/bin/bash

echo "🧪 Testing Claude Analytics Client..."

# Test installation
echo "✓ Checking installation..."
if command -v claude-analytics &> /dev/null; then
    echo "✅ claude-analytics installed"
    VERSION=$(claude-analytics --version 2>&1 | head -1 || echo "unknown")
    echo "   Version: $VERSION"
else
    echo "❌ claude-analytics not found"
    echo "   Checking npm bin directory..."
    NPM_BIN=$(npm bin -g)
    echo "   npm bin: $NPM_BIN"
    if [ -f "$NPM_BIN/claude-analytics" ]; then
        echo "   ⚠️  Binary exists but not in PATH"
        echo "   Try: export PATH=\"$NPM_BIN:\$PATH\""
    else
        echo "   ❌ Binary not found in npm bin"
        echo "   Check: npm list -g claude-analytics"
    fi
    exit 1
fi

# Test basic commands
echo ""
echo "✓ Testing basic commands..."
claude-analytics 2>&1 | head -5

# Test config
echo ""
echo "✓ Checking configuration..."
if [ -f ~/.claude-logged/config.json ]; then
    echo "✅ Sync config exists"
    claude-analytics status
else
    echo "ℹ️  No sync config (normal for new install)"
fi

# Test log directory
echo ""
echo "✓ Checking log directory..."
if [ -d ~/Documents/claude-logs ]; then
    echo "✅ Log directory exists"
    SESSION_COUNT=$(find ~/Documents/claude-logs/sessions -name "*.log" 2>/dev/null | wc -l | xargs)
    echo "   Sessions logged: $SESSION_COUNT"
else
    echo "ℹ️  Log directory not initialized (run 'claude-analytics init')"
fi

echo ""
echo "🎯 Quick test commands:"
echo "  claude-analytics stats      # Should work even without data"
echo "  claude-analytics status     # Check sync status"
echo "  claude-analytics init       # Initialize logging system"
EOF

chmod +x "${BUILD_DIR}/test-client.sh"

# Create quick README
echo "📝 Creating README..."
cat > "${BUILD_DIR}/README-CLIENT.md" << EOF
# Claude Analytics Client

Lightweight client package for testing Claude Analytics on other machines.

## Quick Install

\`\`\`bash
./install.sh
\`\`\`

## Testing

\`\`\`bash
./test-client.sh
\`\`\`

## Configuration

### Local Analytics Only
\`\`\`bash
claude-analytics init
claude-logged  # Use instead of 'claude'
\`\`\`

### With Sync Server
\`\`\`bash
# Point to your sync server
export CLAUDE_SYNC_SERVER=http://your-server:8276

# Login and sync
claude-analytics login
claude-analytics sync
\`\`\`

## What's Included

- \`claude-analytics\` CLI tool
- \`claude-logged\` wrapper (created by init)
- Session logging scripts
- Documentation

## What's NOT Included

- Sync server components
- Admin UI
- Docker files

This is a client-only build. For the full system with server, use the dev build.
EOF

# Ensure bin files are executable
chmod +x "${BUILD_DIR}/bin/claude-logger.js"

# Create archive
echo "📦 Creating archive..."
cd dist
tar -czf "claude-analytics-client-${VERSION}.tar.gz" "claude-analytics-client-${VERSION}/"

# Also create npm pack
echo "📦 Creating npm package..."
cd "claude-analytics-client-${VERSION}"
npm pack --pack-destination=..
cd ..

echo ""
echo "✅ Client build complete!"
echo ""
echo "📦 Packages created:"
echo "  • dist/claude-analytics-client-${VERSION}.tar.gz (full bundle)"
echo "  • dist/claude-analytics-${VERSION}.tgz (npm package)"
echo ""
echo "🚀 To install on another machine:"
echo ""
echo "Option 1 - Using tar bundle:"
echo "  tar -xzf claude-analytics-client-${VERSION}.tar.gz"
echo "  cd claude-analytics-client-${VERSION}"
echo "  ./install.sh"
echo ""
echo "Option 2 - Using npm package:"
echo "  npm install -g claude-analytics-${VERSION}.tgz"
echo ""
echo "💡 Then run: claude-analytics init"