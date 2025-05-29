#!/bin/bash

# Claude Analytics - Multi-session support with file locking
# Prevents conflicts when multiple Claude sessions write to the same log file

LOG_DIR="$HOME/Documents/claude-logs"
DATE=$(date +%Y-%m-%d)
LOG_FILE="$LOG_DIR/$DATE.md"
SESSION_ID="${CLAUDE_SESSION_ID:-$(date +%s)-$$}"
SESSION_LOG="$LOG_DIR/sessions/${SESSION_ID}.log"
LOCK_FILE="$LOG_DIR/.${DATE}.lock"

# Create log directories if they don't exist
mkdir -p "$LOG_DIR/sessions"

# Function to acquire lock
acquire_lock() {
    local max_wait=5
    local wait_time=0
    
    while [ $wait_time -lt $max_wait ]; do
        if mkdir "$LOCK_FILE" 2>/dev/null; then
            echo $$ > "$LOCK_FILE/pid"
            return 0
        fi
        sleep 0.1
        wait_time=$((wait_time + 1))
    done
    
    return 1
}

# Function to release lock
release_lock() {
    rm -rf "$LOCK_FILE"
}

# Function to calculate API costs (simplified calculation in bash)
calculate_api_cost() {
    local input=$1
    local output=$2
    local cache_creation=$3
    local cache_read=$4
    
    # Claude 4 Sonnet pricing (most commonly used): $3/$15 per million tokens, cache: $3.75/$0.30
    local sonnet_cost=$(echo "scale=2; ($input * 3 + $output * 15 + $cache_creation * 3.75 + $cache_read * 0.30) / 1000000" | bc -l 2>/dev/null)
    
    if [ -n "$sonnet_cost" ] && [ "$sonnet_cost" != "0" ]; then
        echo "~\$${sonnet_cost} (Sonnet API)"
    else
        echo "Cost calc unavailable"
    fi
}

# Function to get token usage from claude.json
get_token_usage() {
    local claude_json="$HOME/.claude.json"
    if [ -f "$claude_json" ]; then
        # Extract token values using grep and awk
        local input_tokens=$(grep -o '"lastTotalInputTokens":[[:space:]]*[0-9]*' "$claude_json" | awk -F: '{print $2}' | tr -d ' ')
        local output_tokens=$(grep -o '"lastTotalOutputTokens":[[:space:]]*[0-9]*' "$claude_json" | awk -F: '{print $2}' | tr -d ' ')
        local cache_creation_tokens=$(grep -o '"lastTotalCacheCreationInputTokens":[[:space:]]*[0-9]*' "$claude_json" | awk -F: '{print $2}' | tr -d ' ')
        local cache_read_tokens=$(grep -o '"lastTotalCacheReadInputTokens":[[:space:]]*[0-9]*' "$claude_json" | awk -F: '{print $2}' | tr -d ' ')
        
        local cost=$(calculate_api_cost "${input_tokens:-0}" "${output_tokens:-0}" "${cache_creation_tokens:-0}" "${cache_read_tokens:-0}")
        
        echo "Input: ${input_tokens:-0}, Output: ${output_tokens:-0}, Cache Creation: ${cache_creation_tokens:-0}, Cache Read: ${cache_read_tokens:-0} - $cost"
    else
        echo "Token data unavailable"
    fi
}

# Function to log entry to both main log and session log
log_entry() {
    local message="$1"
    local timestamp=$(date +"%H:%M")
    
    # Log to session file (no lock needed, unique per session)
    echo "[$timestamp] $message" >> "$SESSION_LOG"
    
    # Log to main file with lock
    if acquire_lock; then
        # Check if date has changed
        local current_date=$(date +%Y-%m-%d)
        if [ "$current_date" != "$DATE" ]; then
            DATE="$current_date"
            LOG_FILE="$LOG_DIR/$DATE.md"
        fi
        
        # Add header if file doesn't exist
        if [ ! -f "$LOG_FILE" ]; then
            echo "# $DATE 作業ログ" > "$LOG_FILE"
            echo "" >> "$LOG_FILE"
        fi
        
        echo "## $timestamp [Session: $SESSION_ID]" >> "$LOG_FILE"
        echo "$message" >> "$LOG_FILE"
        echo "" >> "$LOG_FILE"
        release_lock
    else
        echo "Warning: Could not acquire lock for logging" >&2
    fi
}

# Function to merge all session logs into daily log
merge_session_logs() {
    if acquire_lock; then
        local temp_file="$LOG_DIR/.merge_temp.md"
        
        # Create header
        echo "# $DATE 作業ログ" > "$temp_file"
        echo "" >> "$temp_file"
        echo "## Token Usage Summary ($(date +%H:%M))" >> "$temp_file"
        echo "$(get_token_usage)" >> "$temp_file"
        echo "" >> "$temp_file"
        echo "## セッション統合ログ ($(date +%H:%M)更新)" >> "$temp_file"
        echo "" >> "$temp_file"
        
        # Merge all session logs for today
        for session_log in "$LOG_DIR/sessions"/*.log; do
            if [ -f "$session_log" ]; then
                session_name=$(basename "$session_log" .log)
                echo "### Session: $session_name" >> "$temp_file"
                cat "$session_log" >> "$temp_file"
                echo "" >> "$temp_file"
            fi
        done
        
        # Append existing content if any
        if [ -f "$LOG_FILE" ]; then
            echo "" >> "$temp_file"
            echo "---" >> "$temp_file"
            echo "" >> "$temp_file"
            tail -n +4 "$LOG_FILE" >> "$temp_file"  # Skip header
        fi
        
        # Replace the log file
        mv "$temp_file" "$LOG_FILE"
        
        release_lock
    fi
}

# Auto-log function calls (for debugging)
log_command() {
    local cmd="$1"
    shift
    log_entry "Executing: $cmd $@"
    "$cmd" "$@"
    local exit_code=$?
    log_entry "Completed: $cmd (exit code: $exit_code)"
    return $exit_code
}

# Function to log token snapshot
log_token_snapshot() {
    local tokens=$(get_token_usage)
    log_entry "Token snapshot - $tokens"
}

# If called with 'merge' argument, run merge
if [ "$1" = "merge" ]; then
    merge_session_logs
fi

# If called with 'snapshot' argument, log token snapshot
if [ "$1" = "snapshot" ]; then
    # Use a temporary session ID for snapshot logging
    export CLAUDE_SESSION_ID="${CLAUDE_SESSION_ID:-snapshot-$(date +%s)}"
    log_token_snapshot
fi

# Export functions for use in other scripts
export -f log_entry
export -f acquire_lock
export -f release_lock
export -f merge_session_logs
export -f log_command
export -f get_token_usage
export -f log_token_snapshot