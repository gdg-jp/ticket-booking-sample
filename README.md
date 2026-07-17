# 席予約 WebMCP ハンズオン

80 分のハンズオン向けに、WebMCP と直接関係しない処理を減らした完成例です。
アプリは標準の DOM API、Fetch API、HTML フォーム、Cookie API だけで構成しています。

## ファイル

- `index.html`: ログイン画面と宣言型の `reserve_seat` ツール
- `app.js`: セッション Cookie、API 呼び出し、画面の再描画
- `webmcp.js`: 命令型ツールの登録
- `style.css`: 最小限の見た目

デスクトップではログイン・予約・自分の予約を左側、席の状況を右側に表示します。画面幅が狭い場合は1カラムに切り替わります。

## WebMCP ツール

| ツール | 種類 | 処理 |
| --- | --- | --- |
| `ping` | 命令型 | WebMCP の接続を確認 |
| `list_seat` | 命令型 | 全席の状態を取得 |
| `get_my_reservation` | 命令型 | ログイン中の参加者の予約を取得 |
| `cancel_reservation` | 命令型 | ログイン中の参加者の予約を解除 |
| `reserve_seat` | 宣言型 | ログイン中の参加者として席を予約 |

命令型ツールは `document.modelContext.registerTool()` にツール定義を直接渡します。
宣言型ツールはフォームから席番号を受け取り、JavaScript の submit ハンドラが
Cookie の参加者IDを加えて API を呼び出します。Agent に参加者IDを渡さなくても、
人がブラウザで作ったログイン状態を再利用できます。

## 起動

```bash
npx serve -p 8080
```

API は既定で `https://api.webmcp.gdgs.jp` を使用します。変更する場合は、`app.js` の
`API_BASE_URL` と `index.html` の予約フォームの `action` を同じ URL に変更してください。

## ハンズオンの流れ

1. 登録済みの `ping` で WebMCP の接続を確認する
2. ログインフォームへ参加者IDを入力する
3. 予約フォームに `toolname`、`tooldescription`、`toolparamdescription` を追加する
4. `list_seat`、`get_my_reservation`、`cancel_reservation` を順に登録する
5. 各ツールを AI エージェントから実行する

予約解除後は差分更新せず、API からデータを取り直して画面全体を再描画します。
これは効率よりも処理の流れの読みやすさを優先した、意図的な実装です。
