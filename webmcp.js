// WebMCP 命令型ツール

async function registerImperativeTools() {
  if (!document.modelContext?.registerTool) {
    console.warn("[webmcp] document.modelContext.registerTool が見つかりません。");
    return;
  }

  await document.modelContext.registerTool({
    name: "ping",
    title: "Ping",
    description: "WebMCP の命令型 tool が登録できているか確認する。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
    },
    execute: async () => {
      return {
        ok: true,
        message: "pong",
        pageTitle: document.title,
      };
    },
  });

  await document.modelContext.registerTool({
    name: "list_seat",
    title: "Seat List",
    description: "全席の状態一覧を取得する。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
    },
    execute: async () => {
      const data = await getSeats();
      return { seats: data.seats };
    },
  });

  await document.modelContext.registerTool({
    name: "get_my_reservation",
    title: "My Reservation",
    description: "ログイン中の参加者の現在の予約を確認する。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
    },
    execute: async () => {
      return getMyReservation();
    },
  });

  await document.modelContext.registerTool({
    name: "cancel_reservation",
    title: "Cancel Reservation",
    description: "ログイン中の参加者の予約を解除する。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    execute: async () => {
      return cancelReservation();
    },
  });

  console.info("[webmcp] all imperative tools registered");
}

registerImperativeTools();
