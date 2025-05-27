# Claude Logger マルチセッション問題の修正

## 問題点

1. **初期化されていない**: 各ターミナルで `multi-session-logger.sh` が自動的に読み込まれていない
2. **自動実行なし**: 15分ごとの自動ログ機能が設定されていない
3. **環境変数未設定**: `CLAUDE_SESSION_ID` が各セッションで設定されていない
4. **Node.jsからの制限**: `claude-logger start` コマンドが現在のシェルに影響を与えられない

## 修正方法

### 方法1: セットアップスクリプトを実行（推奨）

```bash
cd /Users/KoichiOkawa/claude-logger
./setup-claude-logger.sh
```

これにより以下が設定されます：
- `.zshrc` に自動source設定を追加
- 15分ごとの自動ログをcronに登録
- セッションログの自動マージ機能
- Claudeラッパースクリプトの作成

### 方法2: 手動設定

1. **`.zshrc` に追加**:
```bash
# Claude Multi-Session Logger
if [ -f "$HOME/Documents/claude-logs/multi-session-logger.sh" ]; then
    source "$HOME/Documents/claude-logs/multi-session-logger.sh"
fi
```

2. **crontabに追加**:
```bash
crontab -e
# 以下を追加
*/15 * * * * $HOME/Documents/claude-logs/auto-log-entry.sh >> $HOME/Documents/claude-logs/cron.log 2>&1
```

## 使用方法

### 各ターミナルで初期化後:

```bash
# 手動でログエントリを追加
log_entry "作業内容をここに記述"

# セッションIDを確認
echo $CLAUDE_SESSION_ID

# セッションログをマージ
merge_session_logs
```

### 自動ログの確認:

```bash
# cronログを確認
tail -f ~/Documents/claude-logs/cron.log

# 今日のメインログを確認
cat ~/Documents/claude-logs/$(date +%Y-%m-%d).md

# セッションログを確認
ls -la ~/Documents/claude-logs/sessions/
```

## 修正後の動作

1. **ターミナル起動時**: 自動的に `multi-session-logger.sh` が読み込まれる
2. **15分ごと**: アクティブなClaudeセッションを検出して自動ログ
3. **1時間ごと**: セッションログを自動マージ
4. **ファイルロック**: 複数セッションからの同時書き込みを防止

## トラブルシューティング

```bash
# ログシステムの状態確認
ps aux | grep -E "(claude|auto-log)" | grep -v grep

# cron実行確認
grep "auto-log-entry" /var/log/system.log

# ロックファイル確認
ls -la ~/Documents/claude-logs/.*.lock

# セッション変数確認
env | grep CLAUDE
```