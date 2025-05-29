#!/bin/bash

# Claude Analytics Setup Script
# This script sets up automatic logging for all Claude sessions

echo "🚀 Setting up Claude Analytics..."

# Get the directory of claude-logger
CLAUDE_LOGGER_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if multi-session-logger.sh exists
if [ ! -f "$CLAUDE_LOGGER_DIR/multi-session-logger.sh" ]; then
    echo "❌ Error: multi-session-logger.sh not found in $CLAUDE_LOGGER_DIR"
    exit 1
fi

# Add to .zshrc if not already added
ZSHRC_FILE="$HOME/.zshrc"
LOGGER_SOURCE="source $CLAUDE_LOGGER_DIR/multi-session-logger.sh"

if ! grep -q "claude-logger" "$ZSHRC_FILE" 2>/dev/null; then
    echo "" >> "$ZSHRC_FILE"
    echo "# Claude Logger - Automatic session logging" >> "$ZSHRC_FILE"
    echo "export CLAUDE_LOGGER_DIR=\"$CLAUDE_LOGGER_DIR\"" >> "$ZSHRC_FILE"
    echo "$LOGGER_SOURCE" >> "$ZSHRC_FILE"
    echo "✅ Added to .zshrc"
else
    echo "✅ Already configured in .zshrc"
fi

# Create logs directory
mkdir -p ~/Documents/claude-logs/sessions

# Set up cron jobs for 15-minute intervals
MERGE_CRON="*/15 * * * * $CLAUDE_LOGGER_DIR/multi-session-logger.sh merge"
SNAPSHOT_CRON="*/5 * * * * $CLAUDE_LOGGER_DIR/multi-session-logger.sh snapshot"

(crontab -l 2>/dev/null | grep -v "claude-logger"; echo "$MERGE_CRON"; echo "$SNAPSHOT_CRON") | crontab -

echo "✅ Cron jobs configured for token snapshots (5-min) and log merging (15-min)"

# Create Claude wrapper script
CLAUDE_WRAPPER="$HOME/.local/bin/claude-logged"
mkdir -p "$HOME/.local/bin"

cat > "$CLAUDE_WRAPPER" << 'EOF'
#!/bin/bash
# Claude wrapper with automatic logging

# Generate session ID if not set
export CLAUDE_SESSION_ID="${CLAUDE_SESSION_ID:-$(date +%s)-$$}"

# Source the logger
source "$CLAUDE_LOGGER_DIR/multi-session-logger.sh"

# Capture initial token usage
INITIAL_TOKENS=$(get_token_usage)

# Log session start with token info
log_entry "Claude session started - Tokens: $INITIAL_TOKENS"

# Run Claude with all arguments
claude "$@"

# Capture final token usage
FINAL_TOKENS=$(get_token_usage)

# Log session end with token info
log_entry "Claude session ended - Tokens: $FINAL_TOKENS"
EOF

chmod +x "$CLAUDE_WRAPPER"

echo "✅ Claude wrapper created at $CLAUDE_WRAPPER"

# Update PATH if needed
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo "export PATH=\"\$HOME/.local/bin:\$PATH\"" >> "$ZSHRC_FILE"
    echo "✅ Added ~/.local/bin to PATH"
fi

echo ""
echo "✅ Claude Analytics setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Restart your terminal or run: source ~/.zshrc"
echo "2. Use 'claude-logged' instead of 'claude' for automatic logging"
echo "3. Or add this to each terminal: export CLAUDE_SESSION_ID=\$(date +%s)-\$\$"
echo ""
echo "📊 View logs:"
echo "- Today's log: ~/Documents/claude-logs/\$(date +%Y-%m-%d).md"
echo "- Session logs: ~/Documents/claude-logs/sessions/"
echo ""