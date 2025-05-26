# Claude Logger - 複数Claude Code セッション管理ツール

爆速並列コーディングで月額$200の元を取るあなたを支えたい。

4並列なら実質$50/セッション、8並列なら実質$25/セッション。すべてのプロジェクトのログを15分ごとにわかりやすくまとめ続けるツールです。

## 概要

Claude Codeを複数のターミナルで同時に使用する際の作業ログを一元管理するツールです。

## 主な機能

- **マルチセッション対応**: 複数のClaudeセッションを同時に記録
- **自動ログ記録**: 15分ごとに作業内容を自動保存
- **ファイルロック機能**: 複数セッションからの同時書き込みでも競合しない
- **統計機能**: トークン使用量、作業時間、プロジェクト進捗を可視化

## インストール

```bash
npm install -g claude-logger
```

## 使い方

### 初期設定

```bash
claude-logger init
```

### ログの開始

各ターミナルで以下を実行:

```bash
claude-logger start
```

### 統計の確認

```bash
# 今週の統計
claude-logger stats --this-week

# リアルタイムダッシュボード
claude-logger dashboard

# データのエクスポート
claude-logger export --format csv
```

## ログの形式

```markdown
## 2025-05-26 15:00 - セッションサマリー
- アクティブセッション: 6
- 総トークン数: 3,247,891
- 進行中プロジェクト: 
  - Terminal 1: ECサイト構築 (87%)
  - Terminal 2: MLパイプライン (32%)
  - Terminal 3: iOSアプリ (64%)
  - Terminal 4: APIドキュメント (91%)
  - Terminal 5: DBマイグレーション (15%)
  - Terminal 6: パフォーマンステスト (43%)
```

## 技術仕様

- **ログ保存先**: `~/Documents/claude-logs/`
- **ログ形式**: Markdown
- **更新間隔**: 15分
- **ファイルロック**: `.lock`ファイルによる排他制御

## 使用例

### 並列セッションのコスト分析

```bash
claude-logger cost-analysis --monthly
```

出力例:
```
総セッション数: 847
並列効率: 4.2倍
1セッションあたりの実効単価: $47.62
```

※実効単価 = 月額料金 ÷ 並列セッション数（参考値）

### プロジェクトタイムライン

```bash
claude-logger timeline --export
```

プロジェクトの進行状況をガントチャート形式でエクスポートします。

## 必要環境

- Node.js 14以上
- npm または yarn
- macOS / Linux / Windows (WSL)

## ライセンス

MIT License

## 作者

- GitHub: [@daiokawa](https://github.com/daiokawa)
- Twitter: [@daiokawa](https://twitter.com/daiokawa)
- HendonMob: [Dai Okawa](https://pokerdb.thehendonmob.com/player.php?a=r&n=560516)

## バグ報告・機能要望

[Issues](https://github.com/daiokawa/claude-logger/issues)までお願いします。