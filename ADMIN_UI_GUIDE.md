# Claude Logger Admin UI Guide

The sync server now includes a comprehensive web-based admin interface for managing and monitoring usage data.

## Accessing the Admin UI

1. **URL**: http://localhost:8276/admin
2. **Admin Key**: `59250f94e1ffe330d63ed80d9d749fdb` (auto-generated)

> **Note**: Save this admin key securely! It's required to access the admin interface.

## Features

### 1. Dashboard
- **Overview Stats**: Total users, devices, active devices (24h), and total tokens
- **Recent Activity**: Shows the latest 5 users with their device count and token usage
- **Real-time Updates**: Stats refresh when you revisit the dashboard

### 2. Users Management
- **User List**: Browse all users with pagination (20 per page)
- **Search**: Find users by their key (partial match supported)
- **User Details**: Click "Details" to see:
  - Full user key
  - Creation date and last seen
  - All devices associated with the user
  - Token usage per device
  - Total cost calculations

### 3. Analytics
- **Token Usage Chart**: Line graph showing token usage trends over time
- **Hourly Usage Pattern**: Bar chart showing usage distribution by hour
- **Top Users**: Table of top 10 users by token consumption
- **Visual Insights**: Quickly identify usage patterns and peak hours

## Setting a Custom Admin Key

For production use, set a custom admin key:

```bash
# Stop the server
docker-compose -f claude-logger-server/docker-compose.yml down

# Set custom admin key (use a secure key!)
export ADMIN_KEY="your-very-secure-admin-key-here"

# Restart with the custom key
docker-compose -f claude-logger-server/docker-compose.yml up -d
```

## Security Notes

1. **HTTPS**: In production, always use HTTPS (the local setup uses HTTP)
2. **Admin Key**: Treat the admin key like a password - keep it secure
3. **Session Duration**: Admin sessions last 24 hours
4. **Network Access**: By default, the server listens on all interfaces

## Technical Details

- **Frontend**: Vanilla JavaScript with Chart.js for visualizations
- **Styling**: Custom CSS with responsive design
- **Authentication**: Cookie-based sessions with 24-hour expiry
- **API**: RESTful endpoints under `/api/admin/*`

## Troubleshooting

### Can't access admin UI
1. Check server is running: `docker ps`
2. Verify URL: http://localhost:8276/admin
3. Check browser console for errors

### Login fails
1. Verify admin key is correct
2. Check Docker logs: `docker logs claude-logger-server`
3. Ensure cookies are enabled

### Charts not loading
1. Ensure JavaScript is enabled
2. Check browser console for errors
3. Try refreshing the page

## Future Enhancements

Potential improvements for the admin UI:
- Export functionality for reports
- Email alerts for usage thresholds
- User management (delete users/devices)
- Historical data comparison
- Cost projections and budgeting
- API rate limiting controls