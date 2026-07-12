# 席予約 WebMCP ハンズオン

80 分のハンズオン向けに、WebMCP と直接関係しない処理を減らした完成例です。
アプリは標準の DOM API、Fetch API、HTML フォームだけで構成しています。

## ファイル

- `index.html`: 画面と宣言型の `reserve_seat` ツール
- `app.js`: API 呼び出しと画面の再描画
- `webmcp.js`: 命令型ツールの登録
- `style.css`: 最小限の見た目

## WebMCP ツール

| ツール | 種類 | 処理 |
| --- | --- | --- |
| `seat_summary` | 命令型 | 席数のサマリーを取得 |
| `seat_list` | 命令型 | 全席の状態を取得 |
| `cancel_reservation` | 命令型 | 参加者の予約を解除 |
| `reserve_seat` | 宣言型 | HTML フォームから予約 API を呼び出す |

命令型ツールは `document.modelContext.registerTool()` にツール定義を直接渡します。
宣言型ツールは JavaScript の submit ハンドラを使わず、フォームの `action` と
`method` で API を呼び出します。

## 起動

```bash
python3 -m http.server 8000
```

API は既定で `http://localhost:8787` を使用します。変更する場合は、`app.js` の
`API_BASE_URL` と `index.html` の予約フォームの `action` を同じ URL に変更してください。

## ハンズオンの流れ

1. 動作済みの予約画面と `app.js` を確認する
2. `seat_summary` を登録する
3. 同じ形で `seat_list` と `cancel_reservation` を追加する
4. 予約フォームに `toolname`、`tooldescription`、`toolparamdescription` を追加する
5. ツールを検出して実行する

予約解除後は差分更新せず、API からデータを取り直して画面全体を再描画します。
これは効率よりも処理の流れの読みやすさを優先した、意図的な実装です。
