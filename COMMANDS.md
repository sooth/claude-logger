# Claude Logger Commands Reference

This project provides two main command-line tools:

## 📊 `claude-analytics` - Analytics and Sync

**Purpose**: View statistics, manage sync, analyze usage patterns

### Core Analytics Commands:
```bash
claude-analytics stats           # View local usage statistics
claude-analytics dashboard       # Real-time dashboard
claude-analytics heatmap         # Token usage patterns by hour
claude-analytics timeline        # Session timeline visualization
claude-analytics export csv      # Export data to CSV/JSON
```

### Sync Commands (Multi-Device):
```bash
claude-analytics login           # Setup/manage sync account
claude-analytics status          # Check sync login status
claude-analytics sync            # Upload usage data to server
claude-analytics stats-global    # View combined stats from all devices
```

### Setup Commands:
```bash
claude-analytics init            # Initialize logging system
claude-analytics start           # Start logging in current terminal
claude-analytics merge           # Merge session logs
```

## 🔧 `claude-logged` - Session Wrapper

**Purpose**: Run Claude Code with automatic session logging

### Usage:
```bash
# Instead of running 'claude', use:
claude-logged

# This will:
# 1. Start a logging session
# 2. Run Claude Code with all arguments
# 3. Log token usage before/after
# 4. Track session duration
```

## 🎯 Quick Start Workflow

1. **Setup** (one time):
   ```bash
   claude-analytics init
   ```

2. **For each coding session**, choose one:
   ```bash
   # Option A: Use the wrapper (automatic)
   claude-logged

   # Option B: Manual session logging
   claude-analytics start
   # ... then use 'claude' normally
   ```

3. **View your analytics**:
   ```bash
   claude-analytics stats          # Local statistics
   claude-analytics heatmap        # Usage patterns
   ```

4. **Multi-device sync** (optional):
   ```bash
   claude-analytics login          # One-time setup
   claude-analytics sync           # Upload data
   claude-analytics stats-global   # View combined stats
   ```

## 🔍 Key Distinctions

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `claude-analytics` | View stats, manage sync | After coding sessions, for analysis |
| `claude-logged` | Run Claude with logging | Instead of `claude` command |

## 💡 Pro Tips

- Use `claude-analytics status` to check if you're logged in for sync
- The system tracks tokens automatically - no manual intervention needed
- Session logging works across multiple terminal windows
- All data stays local unless you explicitly sync to a server