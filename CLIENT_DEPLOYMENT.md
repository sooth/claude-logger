# Client Deployment Guide

Quick guide for deploying just the Claude Analytics client (no server) on other machines.

## 🚀 Build Options

### Option 1: Client-Only Build (Recommended)
```bash
npm run build:client
```
Creates lightweight client packages in `dist/`:
- `claude-analytics-3.0.1.tgz` - npm package (23KB)
- `claude-analytics-client-3.0.1.tar.gz` - full bundle (25KB)

### Option 2: Just npm pack
```bash
npm pack
```
Creates standard npm package with all files.

## 📦 Installation Methods

### Method 1: npm Package (Simplest)
```bash
# On target machine:
npm install -g claude-analytics-3.0.1.tgz
claude-analytics init
```

### Method 2: Bundle with Install Script
```bash
# Extract bundle
tar -xzf claude-analytics-client-3.0.1.tar.gz
cd claude-analytics-client-3.0.1

# Run installer
./install.sh

# Test installation
./test-client.sh
```

### Method 3: Direct from npm Registry (if published)
```bash
npm install -g claude-analytics
claude-analytics init
```

### Method 4: Direct from GitHub
```bash
npm install -g https://github.com/yourusername/claude-logger.git
claude-analytics init
```

## 🧪 Testing Installation

Quick test after install:
```bash
# Verify installation
claude-analytics --version
claude-analytics status

# Initialize (one time)
claude-analytics init

# Test wrapper
claude-logged --version
```

## 🔧 Configuration

### Basic Setup (Local Analytics Only)
```bash
# Initialize logging
claude-analytics init

# Use wrapper for sessions
claude-logged  # instead of 'claude'

# View stats
claude-analytics stats
```

### With Remote Sync Server
```bash
# Point to your server
export CLAUDE_SYNC_SERVER=http://your-server:8276

# Login to sync
claude-analytics login
claude-analytics sync
```

Add to `~/.bashrc` or `~/.zshrc` to persist:
```bash
export CLAUDE_SYNC_SERVER=http://your-server:8276
```

## 📋 Requirements

Target machine needs:
- **Node.js 14+** (required)
- **npm** (required)
- **Claude Code** (`claude` command)

Check with:
```bash
node --version  # Should be 14+
npm --version   # Any recent version
claude --version # Claude Code CLI
```

## 🎯 Quick Deployment Examples

### Example 1: Team Deployment
```bash
# Build once
npm run build:client

# Share with team
# Upload claude-analytics-3.0.1.tgz to shared location

# Each team member runs:
npm install -g https://shared/claude-analytics-3.0.1.tgz
claude-analytics init
```

### Example 2: Multiple Personal Machines
```bash
# On development machine
npm run build:client

# Copy to other machines
scp dist/claude-analytics-3.0.1.tgz user@machine2:~/

# On each machine
ssh user@machine2
npm install -g ~/claude-analytics-3.0.1.tgz
claude-analytics init
```

### Example 3: Quick Test
```bash
# Build and test locally
npm run build:client
cd dist/claude-analytics-client-3.0.1
./test-client.sh  # Test without installing
```

## 🐛 Common Issues

### Installation Errors
```bash
# Permission denied
sudo npm install -g claude-analytics-3.0.1.tgz

# Old npm version
npm install -g npm@latest

# Cache issues
npm cache clean --force
```

### Command Not Found
```bash
# Check npm bin path
npm bin -g

# Add to PATH if needed
export PATH="$(npm bin -g):$PATH"
```

### Sync Not Working
```bash
# Check server URL
echo $CLAUDE_SYNC_SERVER

# Test connectivity
curl $CLAUDE_SYNC_SERVER

# Check login status
claude-analytics status
```

## 📊 What Gets Installed

The client package includes:
- ✅ `claude-analytics` command
- ✅ Session logging scripts
- ✅ Multi-device sync capability
- ✅ All analytics features

Does NOT include:
- ❌ Sync server
- ❌ Admin UI
- ❌ Docker files
- ❌ Server deployment scripts

## 💡 Tips

1. **Test First**: Use `./test-client.sh` before full deployment
2. **Version Control**: Keep track of which version is deployed where
3. **Environment**: Set `CLAUDE_SYNC_SERVER` in shell config
4. **Updates**: Just reinstall newer `.tgz` file to upgrade

## 🔄 Updating

To update clients:
```bash
# Build new version
npm run build:client

# Install over existing
npm install -g claude-analytics-3.0.2.tgz

# Config and data are preserved
```