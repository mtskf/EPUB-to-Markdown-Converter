# プロジェクトコンテキスト

AIエージェント向けクイックリファレンス。

## プロジェクト情報
- **名前**: epub2md
- **バージョン**: 1.2.0
- **目的**: EPUBをObsidian向けに最適化されたMarkdownに変換する
- **ステータス**: 開発中 (Active development)

## 必読ドキュメント (優先度順)
1. `docs/dev/LESSONS.md` - 開発の教訓 (最優先)
2. `docs/ARCHITECTURE.md` - システム設計概要
3. `docs/DECISIONS.md` - 最近の設計決定 (最新3-5件)

## 現在のフォーカス (Current Focus)
- (No active focus - waiting for next task)


## 既知の制限事項
- 見出しテキストが重複するとリンクが曖昧になる (最初のマッチが優先)
- 複雑なテーブルはTurndownによってHTMLのまま出力される
- MathJax/LaTeX は未サポート

## ファイルリファレンス
- **コアロジック**: `src/Converter.js`
- **テスト**: `test/converter.test.js`
- **CLIエントリー**: `bin/epub2md.js`
- **設定**: `.agent/rules.md`

## 重要概念 (Key Concepts)
- **アーキテクチャと設計**: `docs/ARCHITECTURE.md` を参照 (見出しテキストリンク, Pre-indexing等)
- **意思決定**: `docs/DECISIONS.md` を参照

## 開発ワークフロー
1. 開始前に `docs/dev/LESSONS.md` を読む
2. ユーザー向け変更は `CHANGELOG.md` を更新
3. アーキテクチャ変更は `docs/DECISIONS.md` にADRを追加
4. 完了後、教訓を `docs/dev/LESSONS.md` に抽出
