// WebMCP 命令型ツール

async function registerImperativeTools() {
  if (!document.modelContext?.registerTool) {
    console.warn("[webmcp] document.modelContext.registerTool が見つかりません。");
    return;
  }

  await Promise.allSettled([
    document.modelContext.registerTool({
      name: "seat_summary",
      description: "会場全体の席サマリーを取得する。",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: async () => {
        const data = await getSeats();
        return { eventName: data.eventName, summary: data.summary };
      },
    }),
    document.modelContext.registerTool({
      name: "seat_list",
      description: "全席の状態一覧を取得する。",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: async () => {
        const data = await getSeats();
        return { seats: data.seats };
      },
    }),
    document.modelContext.registerTool({
      name: "cancel_reservation",
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
      annotations: { readOnlyHint: false },
      execute: async ({ participantId }) => {
        document.querySelector("#participant-id").value = participantId;
        const result = await cancelReservation();
        await render();
        await renderMyReservation();
        return result;
      },
    }),
  ]);
}

registerImperativeTools();
