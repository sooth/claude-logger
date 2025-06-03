# Claude Logger Sync Server

A simple FastAPI-based server for syncing Claude Analytics usage data across multiple devices.

## Features

- **Simple Key-Based Auth**: No usernames/passwords, just a secure 64-character hex key
- **SQLite Storage**: Simple, file-based database (no complex setup)
- **REST API**: Clean API for syncing and retrieving stats
- **Auto Cleanup**: Removes data older than 90 days automatically
- **Docker Support**: Easy deployment with Docker

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone and navigate to server directory
cd claude-logger-server

# Build and run with docker-compose
docker-compose up -d

# Server will be available at http://localhost:8000
```

### Option 2: Manual Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py

# Server will be available at http://localhost:8000
```

## API Endpoints

### Health Check
```
GET /
```

### Sync Data
```
POST /api/sync
Content-Type: application/json

{
  "userKey": "your-64-char-hex-key",
  "hostname": "M4x.local",
  "timestamp": "2025-06-03T10:30:00Z",
  "usage": {
    "totalTokens": 2412018,
    "inputTokens": 1608012,
    "outputTokens": 402003,
    "cacheCreationTokens": 201501,
    "cacheReadTokens": 200502
  },
  "sessions": {
    "total": 30,
    "active": 15,
    "averageDuration": 45.5
  },
  "costs": {
    "opus": 12.06,
    "sonnet": 2.41,
    "haiku": 0.64,
    "actual": 15.11
  },
  "hourlyUsage": [0, 0, 0, ...], // 24 values
  "version": "3.0.2"
}
```

### Get User Stats
```
GET /api/stats/{user_key}

Response:
{
  "devices": [
    {
      "hostname": "M4x.local",
      "lastSeen": "2025-06-03T10:30:00Z",
      "totalTokens": 2412018
    }
  ],
  "totalTokens": 5360000,
  "totalCost": 26.80
}
```

### Get User Devices
```
GET /api/devices/{user_key}

Response:
{
  "status": "success",
  "data": {
    "devices": [
      {
        "hostname": "M4x.local",
        "last_seen": "2025-06-03T10:30:00Z"
      }
    ]
  }
}
```

## Deployment Options

### 1. Heroku

```bash
# Install Heroku CLI
# Create new Heroku app
heroku create claude-logger-sync

# Deploy
git push heroku main
```

### 2. Railway

1. Connect your GitHub repo to Railway
2. Add environment variables if needed
3. Deploy automatically

### 3. VPS with Docker

```bash
# SSH to your VPS
ssh user@your-server.com

# Clone the repo
git clone https://github.com/yourusername/claude-logger.git
cd claude-logger/claude-logger-server

# Run with docker-compose
docker-compose up -d

# Set up nginx reverse proxy (optional)
# Configure SSL with Let's Encrypt (recommended)
```

### 4. Local Network

Perfect for syncing between devices on the same network:

```bash
# Run on a always-on machine (e.g., Mac Mini, Raspberry Pi)
docker-compose up -d

# Update client config to use local IP
export CLAUDE_SYNC_SERVER=http://192.168.1.100:8000
```

## Environment Variables

- `DATABASE_PATH`: Path to SQLite database file (default: `claude_logger.db`)
- `PORT`: Server port (default: 8000)

## Security Notes

1. **HTTPS**: Always use HTTPS in production (the Docker setup doesn't include it)
2. **Key Security**: User keys should be treated like passwords
3. **Rate Limiting**: Consider adding rate limiting for production deployments
4. **Firewall**: Restrict access to trusted IPs if running locally

## Database Schema

The server uses a simple SQLite database with two tables:

- `users`: Stores user keys and metadata
- `device_stats`: Stores usage statistics per device

Data older than 90 days is automatically cleaned up daily at 3 AM.

## Development

```bash
# Install in development mode
pip install -r requirements.txt

# Run with auto-reload
uvicorn main:app --reload

# Run tests (when implemented)
pytest
```

## License

MIT License - Same as claude-logger