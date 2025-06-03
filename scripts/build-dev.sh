#!/bin/bash

# Claude Analytics Dev Build Script
# Creates a portable package for testing on other machines

set -e

echo "🚀 Building Claude Analytics dev package..."

# Get version and create build directory
VERSION=$(node -p "require('./package.json').version")
BUILD_DIR="dist/claude-analytics-dev-${VERSION}"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

echo "📦 Version: ${VERSION}"
echo "🕐 Build: ${TIMESTAMP}"

# Clean and create build directory
rm -rf dist
mkdir -p "${BUILD_DIR}"

# Copy core files
echo "📂 Copying core files..."
cp -r bin/ "${BUILD_DIR}/"
cp -r scripts/ "${BUILD_DIR}/"
cp package.json "${BUILD_DIR}/"
cp *.md "${BUILD_DIR}/"
cp *.sh "${BUILD_DIR}/"
cp *.js "${BUILD_DIR}/" 2>/dev/null || true

# Copy server components
echo "🖥️  Copying server components..."
cp -r claude-logger-server/ "${BUILD_DIR}/"

# Create installation script
echo "⚙️  Creating installation script..."
cat > "${BUILD_DIR}/install.sh" << 'EOF'
#!/bin/bash

echo "🚀 Installing Claude Analytics (Dev Build)..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not found"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is required but not found"
    exit 1
fi

# Install globally
echo "📦 Installing claude-analytics globally..."
npm install -g .

# Initialize if desired
echo ""
read -p "🎯 Initialize claude-analytics now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    claude-analytics init
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "📊 Try these commands:"
echo "  claude-analytics stats      # View usage statistics"
echo "  claude-analytics login      # Setup sync (optional)"
echo "  claude-analytics --help     # See all commands"
echo ""
EOF

chmod +x "${BUILD_DIR}/install.sh"

# Create server deployment script
echo "🐳 Creating server deployment script..."
cat > "${BUILD_DIR}/deploy-server.sh" << 'EOF'
#!/bin/bash

echo "🐳 Deploying Claude Analytics Sync Server..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not found"
    echo "Please install Docker from https://docker.com/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is required but not found"
    exit 1
fi

# Find an available port
echo "🔍 Finding available port..."
for port in {8276..8299}; do
    if ! lsof -i:$port >/dev/null 2>&1; then
        SERVER_PORT=$port
        break
    fi
done

if [ -z "$SERVER_PORT" ]; then
    echo "❌ No available ports found in range 8276-8299"
    exit 1
fi

echo "📡 Using port: $SERVER_PORT"

# Update docker-compose with available port
sed "s/8276:8000/$SERVER_PORT:8000/g" claude-logger-server/docker-compose.yml > claude-logger-server/docker-compose-dev.yml

# Deploy server
echo "🚀 Starting server..."
cd claude-logger-server
docker-compose -f docker-compose-dev.yml up -d --build

# Get admin key
sleep 3
ADMIN_KEY=$(docker logs claude-logger-server 2>&1 | grep "ADMIN_KEY" | head -1 | cut -d: -f3 | xargs)

echo ""
echo "✅ Server deployed successfully!"
echo ""
echo "🌐 Server URL: http://localhost:$SERVER_PORT"
echo "🔑 Admin Key: $ADMIN_KEY"
echo "📊 Admin UI: http://localhost:$SERVER_PORT/admin"
echo ""
echo "🔧 Configure clients:"
echo "export CLAUDE_SYNC_SERVER=http://localhost:$SERVER_PORT"
echo ""
echo "💡 Add to your shell config (.bashrc/.zshrc) to persist"
echo ""
EOF

chmod +x "${BUILD_DIR}/deploy-server.sh"

# Create README for the build
echo "📝 Creating build README..."
cat > "${BUILD_DIR}/README-DEV-BUILD.md" << EOF
# Claude Analytics Dev Build

**Version**: ${VERSION}  
**Built**: ${TIMESTAMP}

## Quick Installation

\`\`\`bash
# Install claude-analytics
./install.sh

# Optional: Deploy local sync server
./deploy-server.sh
\`\`\`

## What's Included

- **claude-analytics**: Main CLI tool with all analytics and sync features
- **claude-logged**: Wrapper script for automatic session logging
- **Sync Server**: Docker-based server for multi-device synchronization
- **Admin UI**: Web interface for server management

## Installation Options

### Option 1: Simple Install (Local analytics only)
\`\`\`bash
./install.sh
claude-analytics init
\`\`\`

### Option 2: Full Setup (With sync server)
\`\`\`bash
./install.sh
./deploy-server.sh
# Follow prompts to configure sync
\`\`\`

## Commands Reference

### Analytics Commands:
\`\`\`bash
claude-analytics stats           # View usage statistics
claude-analytics heatmap         # Usage patterns by hour
claude-analytics timeline        # Session timeline
claude-analytics export csv      # Export data
\`\`\`

### Sync Commands:
\`\`\`bash
claude-analytics login           # Setup sync account
claude-analytics sync            # Upload data to server
claude-analytics stats-global    # View combined stats
\`\`\`

### Session Logging:
\`\`\`bash
claude-logged                    # Use instead of 'claude'
\`\`\`

## File Structure

\`\`\`
claude-analytics-dev-${VERSION}/
├── install.sh                  # Main installation script
├── deploy-server.sh             # Server deployment script
├── bin/claude-logger.js         # Main CLI application
├── claude-logger-server/        # Sync server components
├── scripts/                     # Setup and utility scripts
└── *.md                         # Documentation
\`\`\`

## Troubleshooting

- **Installation fails**: Ensure Node.js 14+ is installed
- **Server won't start**: Check Docker is running and ports available
- **Sync issues**: Verify CLAUDE_SYNC_SERVER environment variable

## Development Notes

This is a development build for testing. For production use:
1. Set custom admin keys via environment variables
2. Use HTTPS for sync servers
3. Configure proper firewall rules
4. Set up automated backups for database

EOF

# Create archive
echo "📦 Creating archive..."
cd dist
tar -czf "claude-analytics-dev-${VERSION}-${TIMESTAMP}.tar.gz" "claude-analytics-dev-${VERSION}/"

# Create checksums
echo "🔐 Generating checksums..."
sha256sum "claude-analytics-dev-${VERSION}-${TIMESTAMP}.tar.gz" > "claude-analytics-dev-${VERSION}-${TIMESTAMP}.sha256"

echo ""
echo "✅ Dev build complete!"
echo ""
echo "📦 Package: dist/claude-analytics-dev-${VERSION}-${TIMESTAMP}.tar.gz"
echo "🔐 Checksum: dist/claude-analytics-dev-${VERSION}-${TIMESTAMP}.sha256"
echo ""
echo "🚚 To deploy on another machine:"
echo "1. Copy the .tar.gz file to the target machine"
echo "2. Extract: tar -xzf claude-analytics-dev-${VERSION}-${TIMESTAMP}.tar.gz"
echo "3. Run: cd claude-analytics-dev-${VERSION} && ./install.sh"
echo ""