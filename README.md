# albam

Apple Music の好きなアルバムを、タグで整理するための自分用 Web アプリです。

- Apple Music の共有 URL を貼るだけで、ジャケット・収録曲などを取り込めます（iTunes Lookup API を使用）。
- タグは複数付けられ、グループ分け・名前変更・統合・枚数表示ができます。
- ★5段階（半星あり）の評価と、メモを残せます。
- 検索、タグ絞り込み（AND/OR）、並び替え、グリッド/リスト表示に対応しています。
- データはブラウザ内（IndexedDB）に保存されます。設定画面から JSON で書き出し・読み込みできます。

要件は [docs/requirements.md](docs/requirements.md) を参照してください。

## 開発

```sh
npm install
npm run dev     # 開発サーバー
npm test        # ユニットテスト
npm run build   # dist/ に本番ビルド
```

## 公開（GitHub Pages）

1. リポジトリの Settings → Pages → Build and deployment の Source を「GitHub Actions」にする
2. `main` ブランチに push すると `.github/workflows/deploy.yml` が動き、`https://<ユーザー名>.github.io/albam/` に公開されます
