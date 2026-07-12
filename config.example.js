// このファイルを config.js としてコピーしてから使ってください。
// config.js は .gitignore に含まれています。
window.APP_CONFIG = {
  // 本番デプロイした Cloudflare Workers の URL に差し替えてください。
  apiBaseUrl: "http://localhost:8787",

  // true にすると自分以外の予約者IDも画面に表示されるようになります。
  // API 側の EXPOSE_PARTICIPANT_ID も同じ値にする必要があります。
  showReservedBy: false,
};
