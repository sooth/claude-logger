# Claude Analytics 🚀 - Advanced Claude Code Analytics

<p align="center">
  <img src="https://img.shields.io/badge/Claude-Analytics-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyUzYuNDggMjIgMTIgMjJTMjIgMTcuNTIgMjIgMTJTMTcuNTIgMiAxMiAyWk0xMiAyMEM3LjU4IDIwIDQgMTYuNDIgNCAxMlM3LjU4IDQgMTIgNFMyMCA3LjU4IDIwIDEyUzE2LjQyIDIwIDEyIDIwWiIgZmlsbD0iIzAwMDAwMCIvPgo8cGF0aCBkPSJNOCA4SDE2VjEwSDhWOFoiIGZpbGw9IiMwMDAwMDAiLz4KPHBhdGggZD0iTTggMTJIMTZWMTRIOFYxMloiIGZpbGw9IiMwMDAwMDAiLz4KPC9zdmc+" alt="Claude Analytics">
  <br>
  <img src="https://img.shields.io/npm/v/claude-analytics?style=flat-square" alt="npm version">
  <img src="https://img.shields.io/npm/dm/claude-analytics?style=flat-square" alt="npm downloads">
  <img src="https://img.shields.io/github/license/sooth/claude-logger?style=flat-square" alt="License">
</p>

<p align="center">
  <b>🔥 Track ALL your Claude sessions with advanced analytics and cost insights 🔥</b>
</p>

## ✨ What's New in This Enhanced Version

This fork adds **comprehensive token tracking and analytics** that the original version was missing:

- **💰 Real API Cost Analysis** - See exactly how much you save with Claude Max vs pay-per-token pricing
- **🔥 Token Usage Heatmaps** - Discover your peak productivity hours with visual analytics
- **📅 Project Timeline Visualization** - Track session duration and parallel work patterns
- **📊 Advanced Export System** - Export data to CSV/JSON for external analysis
- **🎯 Enhanced Statistics** - Detailed breakdowns of input/output/cache token usage
- **⚡ Real-time Tracking** - Live token snapshots every 5 minutes
- **☁️ NEW: Multi-Device Sync** - Aggregate usage across all your machines with secure cloud sync

## 🚀 Quick Start

```bash
# Install globally
npm install -g claude-analytics

# Initialize automatic logging
claude-analytics init

# Start logging in any terminal
claude-analytics start

# View enhanced statistics
claude-analytics stats
```

## 📊 Features Overview

### 💰 API Cost Analysis
Understand exactly how much your Claude Max subscription saves you:

```bash
$ claude-analytics stats

📈 Statistics:
Active sessions: 30

🎯 Token Usage:
Input tokens: 31,154
Output tokens: 6,181
Cache creation tokens: 60,571
Cache read tokens: 706,100
Total tokens: 804,006

💰 Cost Analysis:
Claude Max subscription: $200/month
Cost per session: $6.67

🚨 API Cost Comparison (if using pay-per-token):
Claude 4 Opus:    $3.13 (1.6% of subscription)
Claude 4 Sonnet:  $0.63 (0.3% of subscription)
Claude 3.5 Haiku: $0.17 (0.1% of subscription)

💎 Subscription savings: $196.87 (98.4% saved vs most expensive API)
```

### 🔥 Token Usage Heatmaps
Find your most productive hours with visual token usage patterns:

```bash
$ claude-analytics heatmap

📊 Hourly Token Usage Pattern:
00:00 │░░░░░░░░░░░░░░░░░░░░│ 0 tokens
01:00 │░░░░░░░░░░░░░░░░░░░░│ 0 tokens
02:00 │░░░░░░░░░░░░░░░░░░░░│ 0 tokens
...
08:00 │█████████████░░░░░░░│ 1,608,012 tokens
09:00 │████████████████████│ 2,412,018 tokens
10:00 │░░░░░░░░░░░░░░░░░░░░│ 0 tokens
...

🎯 Peak Usage Analysis:
Peak hour: 09:00 (2,412,018 tokens)
Quietest hour: 08:00

⏰ Time Period Analysis:
Morning (06-12): 4,020,030 tokens
Afternoon (12-18): 0 tokens
Evening (18-24): 0 tokens
Night (00-06): 0 tokens
```

### 📅 Project Timeline Visualization
Track your session patterns and parallel work efficiency:

```bash
$ claude-analytics timeline

🕐 Session Timeline (Recent):
🔴 13:39 - 15:09 (1h 30m) | Session: ...64164
🔴 13:47 - 13:47 (0m) | Session: ...94153
🟢 13:47 - ongoing (active) | Session: ...95227
🟢 13:49 - ongoing (active) | Session: ...96635
🟢 14:01 - ongoing (active) | Session: ...55296
🔴 14:50 - 15:12 (22m) | Session: ...90815

📊 Summary:
Total sessions tracked: 30
Currently active: 15
Completed today: 15
```

### 📊 Data Export
Export your productivity data for external analysis:

```bash
# Export to CSV
$ claude-analytics export csv
📊 Exporting data in CSV format...
✅ CSV export saved: ~/Documents/claude-logs/claude-analytics-export-2025-05-29.csv

# Export to JSON
$ claude-analytics export json
📊 Exporting data in JSON format...
✅ JSON export saved: ~/Documents/claude-logs/claude-analytics-export-2025-05-29.json

📈 Export Summary:
Sessions exported: 30
Active sessions: 15
Total tokens: 4,020,030
```

## 🛠️ Installation & Setup

### Option 1: Global Install (Recommended)
```bash
npm install -g claude-analytics
claude-analytics init
```

### Option 2: Manual Setup
```bash
git clone https://github.com/sooth/claude-analytics.git
cd claude-analytics
npm install -g .
claude-analytics init
```

The `init` command will:
- Set up automatic logging for all terminals
- Configure 5-minute token snapshots and 15-minute log merging
- Create session tracking directories
- Add shell integration to your `.zshrc`

## 🎯 Usage

### Basic Commands

```bash
# View comprehensive statistics
claude-analytics stats

# Real-time dashboard
claude-analytics dashboard

# Generate usage heatmaps
claude-analytics heatmap

# View session timeline
claude-analytics timeline

# Export data
claude-analytics export csv    # or json

# Merge session logs
claude-analytics merge
```

### 🆕 Multi-Device Sync

```bash
# First-time setup (generate key)
claude-analytics login

# Sync to cloud
claude-analytics sync

# View stats from all devices
claude-analytics stats-global
```

See [SYNC_SETUP.md](SYNC_SETUP.md) for detailed sync configuration.

### Starting Sessions

After running `claude-analytics init`, you have two options:

1. **Use the wrapper** (automatic):
   ```bash
   claude-logged  # Instead of 'claude'
   ```

2. **Manual activation** per terminal:
   ```bash
   claude-analytics start  # Then follow instructions
   ```

## 💡 Understanding Your Data

### Token Types Explained
- **Input tokens**: Text you send to Claude
- **Output tokens**: Claude's responses
- **Cache creation tokens**: Building prompt cache (90% discount available)
- **Cache read tokens**: Reading from prompt cache (huge savings)

**Important**: Token numbers show **cumulative project totals**, not per-session usage. This is how Claude Code tracks usage - by project, not individual sessions. All sessions in the same project will show the same total numbers.

### Cost Savings Analysis
The cost comparison shows how much you would pay with different Claude API tiers:
- **Claude 4 Opus**: Premium model ($15/$75 per million tokens)
- **Claude 4 Sonnet**: Balanced model ($3/$15 per million tokens)  
- **Claude 3.5 Haiku**: Fast model ($0.80/$4 per million tokens)

Your Claude Max subscription provides unlimited usage for $200/month, typically saving 95%+ vs API pricing.

### Productivity Insights
- **Heatmaps** reveal your most productive hours
- **Timeline** shows session overlap and parallel efficiency
- **Export data** enables custom analysis in Excel, Python, etc.

## 🖥️ Platform Support
- ✅ macOS
- ✅ Linux  
- ✅ Windows (WSL)

## 📁 File Structure

Your logs are organized in `~/Documents/claude-logs/`:
```
claude-logs/
├── 2025-05-29.md              # Daily merged logs
├── sessions/                  # Individual session logs
│   ├── 1748366389-48238.log   # Session-specific tracking
│   └── 1748366671-51644.log
└── claude-logger-export-*.csv # Exported data files
```

## 🚨 Troubleshooting

### Sessions not logging?
1. Restart your terminal after running `claude-analytics init`
2. Check that `~/Documents/claude-logs/sessions/` exists
3. Try `claude-analytics start` in each terminal

### Token data not showing?
1. Ensure you're using Claude Code (not Claude web interface)
2. Check that `~/.claude.json` exists and contains project data
3. Run a few Claude commands to generate token usage

### Export files empty?
1. Wait for token snapshots to be generated (every 5 minutes)
2. Use `claude-logged` wrapper or manual `claude-analytics start`
3. Check session logs in `~/Documents/claude-logs/sessions/`

## 🤝 Contributing

This is an enhanced fork of the original claude-logger, now published as claude-analytics. Contributions welcome!

1. Fork this repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details.

## 🙏 Credits

- Original claude-logger by [@daiokawa](https://github.com/daiokawa)
- Enhanced with comprehensive analytics and token tracking
- Built for the Claude Code power user community

---

**Track smarter. Code better. Optimize everything.**

[![npm version](https://badge.fury.io/js/claude-analytics.svg)](https://www.npmjs.com/package/claude-analytics)
[![Downloads](https://img.shields.io/npm/dm/claude-analytics.svg)](https://www.npmjs.com/package/claude-analytics)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)