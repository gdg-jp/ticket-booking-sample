// WebMCP 命令型ツール

async function registerImperativeTools() {
  if (!document.modelContext?.registerTool) {
    console.warn("[webmcp] document.modelContext.registerTool が見つかりません。");
    return;
  }

  await Promise.allSettled([
    document.modelContext.registerTool({
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
    }),
    document.modelContext.registerTool({
      name: "seat_summary",
      title: "Seat Summary",
      description: "会場全体の席サマリーを取得する。",
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
        return { eventName: data.eventName, summary: data.summary };
      },
    }),
    document.modelContext.registerTool({
      name: "seat_list",
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
    }),
    document.modelContext.registerTool({
      name: "my_reservation",
      title: "My Reservation",
      description: "参加者IDを指定して、その参加者の現在の予約を確認する。",
      inputSchema: {
        type: "object",
        properties: {
          participantId: {
            type: "string",
            description: "予約状況を確認する参加者ID。",
          },
        },
        required: ["participantId"],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: true,
      },
      execute: async ({ participantId }) => {
        const input = document.querySelector("#participant-id");
        input.value = participantId;
        const data = await getMyReservation();
        await renderMyReservation();
        return data;
      },
    }),
    document.modelContext.registerTool({
      name: "cancel_reservation",
      title: "Cancel Reservation",
      description: "参加者IDを指定して、その参加者の予約を解除する。",
      inputSchema: {
        type: "object",
        properties: {
          participantId: {
            type: "string",
            description: "予約時に使用した参加者ID。",
          },
        },
        required: ["participantId"],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: false,
      },
      execute: async ({ participantId }) => {
        const input = document.querySelector("#participant-id");
        input.value = participantId;
        const result = await cancelReservation();
        await render();
        await renderMyReservation();
        return result;
      },
    }),
  ]);

  console.info("[webmcp] all imperative tools registered");
}

registerImperativeTools();
