#!/bin/bash

# Multi-Session Logger for Claude
# Prevents log conflicts between multiple Claude instances

# Get unique session ID
SESSION_ID="${CLAUDE_SESSION_ID:-$(date +%s)-$$}"
export CLAUDE_SESSION_ID="$SESSION_ID"

# Base paths
LOG_DIR="$HOME/Documents/claude-logs"
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M)

# Create session-specific log file
SESSION_LOG="$LOG_DIR/sessions/${DATE}-session-${SESSION_ID}.md"
MAIN_LOG="$LOG_DIR/${DATE}.md"
LOCK_FILE="$LOG_DIR/.${DATE}.lock"

# Ensure directories exist
mkdir -p "$LOG_DIR/sessions"

# Function to acquire lock
acquire_lock() {
    local max_wait=10
    local waited=0
    
    while [ -f "$LOCK_FILE" ] && [ $waited -lt $max_wait ]; do
        sleep 0.1
        waited=$((waited + 1))
    done
    
    # Create lock with our session ID
    echo "$SESSION_ID" > "$LOCK_FILE"
}

# Function to release lock
release_lock() {
    if [ -f "$LOCK_FILE" ] && [ "$(cat "$LOCK_FILE" 2>/dev/null)" = "$SESSION_ID" ]; then
        rm -f "$LOCK_FILE"
    fi
}

# Function to append to main log safely
append_to_main_log() {
    local content="$1"
    
    acquire_lock
    
    # Append with session marker
    echo "## $TIME [Session: $SESSION_ID]" >> "$MAIN_LOG"
    echo "$content" >> "$MAIN_LOG"
    echo "" >> "$MAIN_LOG"
    
    release_lock
}

# Function to write session log
write_session_log() {
    local content="$1"
    
    if [ ! -f "$SESSION_LOG" ]; then
        cat > "$SESSION_LOG" << EOF
# Claude Session Log: $SESSION_ID
Started: $(date)
Terminal: $(tty)

EOF
    fi
    
    echo "## $TIME" >> "$SESSION_LOG"
    echo "$content" >> "$SESSION_LOG"
    echo "" >> "$SESSION_LOG"
}

# Main logging function
log_entry() {
    local content="$1"
    
    # Write to session-specific log
    write_session_log "$content"
    
    # Append to main log with lock protection
    append_to_main_log "$content"
    
    echo "✅ Logged to:"
    echo "  - Session: $SESSION_LOG"
    echo "  - Main: $MAIN_LOG"
}

# Auto-merge function for combining session logs
merge_session_logs() {
    local merged_file="$LOG_DIR/${DATE}-merged.md"
    
    echo "# Merged Claude Logs for $DATE" > "$merged_file"
    echo "" >> "$merged_file"
    
    # Sort and merge all session logs by timestamp
    for session_log in "$LOG_DIR/sessions/${DATE}-session-"*.md; do
        if [ -f "$session_log" ]; then
            echo "## Session: $(basename "$session_log" .md)" >> "$merged_file"
            cat "$session_log" >> "$merged_file"
            echo "" >> "$merged_file"
        fi
    done
    
    echo "📋 Merged logs saved to: $merged_file"
}

# Display usage
if [ "$1" = "help" ]; then
    echo "Multi-Session Logger Usage:"
    echo "  source multi-session-logger.sh     # Initialize in current session"
    echo "  log_entry \"Your log content\"       # Log an entry"
    echo "  merge_session_logs                 # Merge all session logs"
    echo "  echo \$CLAUDE_SESSION_ID            # Show current session ID"
    exit 0
fi

# Initialize session
echo "🚀 Multi-Session Logger initialized"
echo "📍 Session ID: $SESSION_ID"
echo "📂 Session log: $SESSION_LOG"