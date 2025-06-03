# Claude Analytics Sync Setup Guide

This guide will help you set up the centralized sync system for Claude Analytics.

## Overview

The sync system allows you to:
- Aggregate usage statistics across multiple machines
- View combined token usage and costs
- Track usage patterns across all your devices
- Access your data from anywhere

## Client Setup

### 1. Login/Register

On your first device:
```bash
# Generate a new user key
claude-analytics login

# Choose option 1 to generate a new key
# Save the 64-character key securely!
```

On additional devices:
```bash
# Use existing key
claude-analytics login

# Choose option 2 and enter your key
```

### 2. Manual Sync

```bash
# Sync current device stats to cloud
claude-analytics sync

# View global stats from all devices
claude-analytics stats-global
```

### 3. Automatic Sync

Automatic hourly sync is configured during `claude-analytics init`. To verify:

```bash
# Check cron jobs
crontab -l | grep claude
```

## Server Deployment

### Option 1: Local Network (Simplest)

Perfect for home/office use:

1. **Set up on always-on machine:**
   ```bash
   cd claude-logger-server
   docker-compose up -d
   ```

2. **Configure clients to use local server:**
   ```bash
   # Add to ~/.zshrc or ~/.bashrc
   export CLAUDE_SYNC_SERVER=http://192.168.1.100:8000
   ```

### Option 2: Free Cloud Hosting

**Railway (Recommended for beginners):**
1. Fork the claude-logger repo
2. Sign up at [railway.app](https://railway.app)
3. Create new project → Deploy from GitHub repo
4. Select the `claude-logger-server` directory
5. Railway auto-detects the Dockerfile and deploys
6. Get your server URL from Railway dashboard

**Render:**
1. Sign up at [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repo
4. Set root directory to `claude-logger-server`
5. Deploy

### Option 3: VPS Deployment

For more control:

```bash
# On your VPS
git clone https://github.com/yourusername/claude-logger.git
cd claude-logger/claude-logger-server

# Create .env file
echo "DATABASE_PATH=/data/claude_logger.db" > .env

# Run with Docker
docker-compose up -d

# Set up reverse proxy with nginx
# Configure SSL with Let's Encrypt
```

## Configuration

### Client Config Location
```
~/.claude-logged/config.json
```

### Config Structure
```json
{
  "userKey": "your-64-char-key",
  "syncEnabled": true,
  "hostname": "M4x.local",
  "lastSync": "2025-06-03T10:30:00Z",
  "createdAt": "2025-06-01T08:00:00Z"
}
```

### Environment Variables

**Client:**
```bash
# Use custom sync server
export CLAUDE_SYNC_SERVER=https://your-server.com

# Disable sync temporarily
export CLAUDE_SYNC_ENABLED=false
```

## Usage Examples

### View Combined Stats
```bash
$ claude-analytics stats-global

🌍 Global Usage Statistics (All Devices)

Devices: 3
- M4x.local: 2,412,018 tokens (45%)
- ubuntu-server: 1,608,012 tokens (30%)
- macbook-work: 1,339,970 tokens (25%)

Total Usage: 5,360,000 tokens
Total Cost (if API): $26.80
```

### Sync Status
```bash
$ claude-analytics sync

📤 Syncing usage data to server...

✅ Synced 2,412,018 tokens from M4x.local
✅ Last sync: 6/3/2025, 10:30:00 AM
```

## Troubleshooting

### Sync Fails

1. **Check login status:**
   ```bash
   cat ~/.claude-logged/config.json
   ```

2. **Test server connection:**
   ```bash
   curl https://your-sync-server.com/
   ```

3. **Check server logs:**
   ```bash
   docker-compose logs -f
   ```

### Missing Data

- Ensure `claude-analytics init` was run
- Check that sessions are being logged
- Verify cron jobs are running

### Server Issues

- Check disk space for SQLite database
- Verify Docker is running
- Check firewall rules for port 8000

## Privacy & Security

1. **Data Stored**: Only aggregated statistics, no prompts/responses
2. **Encryption**: Use HTTPS in production
3. **Key Security**: Treat your key like a password
4. **Data Retention**: 90 days by default
5. **Self-Hosted**: You control your data

## Advanced Usage

### Custom Sync Interval

```bash
# Edit crontab for different interval
crontab -e

# Sync every 30 minutes
*/30 * * * * /path/to/claude-analytics sync
```

### Multiple Users

Each user gets their own unique key. The server supports unlimited users.

### API Access

You can directly query the sync server API:

```bash
# Get your stats
curl https://your-server.com/api/stats/your-user-key

# Get device list
curl https://your-server.com/api/devices/your-user-key
```

## Support

- Issues: [GitHub Issues](https://github.com/sooth/claude-logger/issues)
- Discussions: [GitHub Discussions](https://github.com/sooth/claude-logger/discussions)