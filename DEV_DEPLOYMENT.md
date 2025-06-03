# Development Deployment Guide

This guide shows you how to create and deploy development builds of Claude Analytics for testing on other machines.

## 🚀 Creating a Dev Build

### Option 1: Using npm script (Recommended)
```bash
npm run build:dev
```

### Option 2: Manual build
```bash
./scripts/build-dev.sh
```

Both create a timestamped package in `dist/` with everything needed for deployment.

## 📦 What Gets Packaged

The dev build includes:
- **Core CLI application** (`claude-analytics`)
- **Session wrapper** (`claude-logged`)
- **Sync server** (Docker-based)
- **Admin UI** (Web interface)
- **Installation scripts** (Automated setup)
- **Documentation** (All README files)

## 🚚 Deploying to Another Machine

### Step 1: Transfer the Package
```bash
# Copy the .tar.gz file to target machine
scp dist/claude-analytics-dev-*.tar.gz user@remote-machine:~/

# Or use any file transfer method (USB, cloud storage, etc.)
```

### Step 2: Install on Target Machine
```bash
# Extract the package
tar -xzf claude-analytics-dev-*.tar.gz
cd claude-analytics-dev-*

# Run installation (requires Node.js 14+)
./install.sh
```

### Step 3: Optional - Deploy Sync Server
```bash
# Deploy local sync server (requires Docker)
./deploy-server.sh
```

## 🧪 Testing the Installation

After installation, run the test script:
```bash
./scripts/test-remote.sh
```

Or test manually:
```bash
# Test basic functionality
claude-analytics --help
claude-analytics stats

# Test sync status
claude-analytics status

# Initialize if needed
claude-analytics init
```

## 🌐 Multi-Machine Sync Setup

### Scenario 1: Central Server
1. Deploy server on one always-on machine:
   ```bash
   ./deploy-server.sh
   ```
2. Note the server URL and admin key
3. On all client machines:
   ```bash
   export CLAUDE_SYNC_SERVER=http://server-ip:port
   claude-analytics login
   ```

### Scenario 2: Local Testing
1. Each machine runs its own server (different ports)
2. Use for isolated testing before central deployment

## 📋 Requirements

### Target Machine Requirements:
- **Node.js 14+** (required)
- **npm** (required)
- **Docker** (optional, for sync server)
- **curl** (for connectivity tests)

### Check requirements:
```bash
node --version    # Should be 14+
npm --version     # Any recent version
docker --version  # Optional
```

## 🔧 Configuration Options

### Environment Variables:
```bash
# Sync server URL (defaults to public instance)
export CLAUDE_SYNC_SERVER=http://localhost:8276

# Admin key for server (auto-generated if not set)
export ADMIN_KEY=your-secure-admin-key

# Disable sync temporarily
export CLAUDE_SYNC_ENABLED=false
```

### Configuration Files:
- `~/.claude-logged/config.json` - Sync configuration
- `~/Documents/claude-logs/` - Log storage
- Docker volumes - Server database

## 🐛 Troubleshooting

### Installation Issues:
```bash
# Node.js not found
# Install from https://nodejs.org/

# Permission errors
sudo npm install -g .

# Missing dependencies
npm install
```

### Server Issues:
```bash
# Port conflicts
# deploy-server.sh automatically finds available ports

# Docker not running
sudo systemctl start docker  # Linux
# or start Docker Desktop on macOS/Windows

# Container logs
docker logs claude-logger-server
```

### Sync Issues:
```bash
# Check server connectivity
curl $CLAUDE_SYNC_SERVER

# Reset sync configuration
rm -rf ~/.claude-logged/
claude-analytics login

# Manual sync test
claude-analytics sync
```

## 📊 Verification Checklist

After deployment, verify:
- [ ] `claude-analytics --help` shows all commands
- [ ] `claude-analytics stats` runs without errors
- [ ] `claude-logged` wrapper exists (after init)
- [ ] Sync server responds (if deployed)
- [ ] Admin UI accessible (if server deployed)
- [ ] Can create sync account and upload data

## 🔄 Updating Dev Builds

To update to a newer version:
1. Create new dev build on development machine
2. Transfer to target machine
3. Extract to new directory
4. Run `./install.sh` (will upgrade globally)
5. Existing configuration and data preserved

## 💡 Best Practices

1. **Use timestamped builds** - Easy to track versions
2. **Test locally first** - Verify build before distribution  
3. **Document server URLs** - Keep track of deployed servers
4. **Backup configurations** - Save sync keys and admin keys
5. **Monitor disk usage** - Log files can grow over time

## 📈 Production Considerations

For production deployment:
- Use HTTPS for sync servers
- Set custom admin keys
- Configure firewall rules
- Set up automated backups
- Monitor server resources
- Use process managers (PM2, systemd)