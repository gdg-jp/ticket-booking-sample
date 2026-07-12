// ---------------------------------------------------------------
// WebMCP 実装 (完成品参照)
// ---------------------------------------------------------------
// このファイルは、参加者用サイトに「WebMCP を追加したらこうなる」という
// 完成イメージを示すためのものです。
//
// W3C Web Machine Learning CG の WebMCP 仕様に沿っており、
// webmcp-bridge-extension (Chrome 拡張) から検出可能です。
//   仕様: https://webmachinelearning.github.io/webmcp/
//
// 実装している API は 2 種類:
//
//   1. 命令型 (imperative)  — document.modelContext.registerTool()
//        - seat_summary          席サマリー取得
//        - seat_list             全席一覧取得
//        - my_reservation        自分の予約取得
//        - set_participant_id    参加者ID 設定
//        - cancel_reservation    自分の予約解除
//
//   2. 宣言型 (declarative) — <form toolname tooldescription>
//        - reserve_seat          席予約 (form は index.html にある)
//
// 命令型 5 個 + 宣言型 1 個で、両方の API パターンを 1 ページに同居させています。
//
// 前提:
//   - `app.js` が先に読み込まれ、`getSeats` / `reserveSeat` /
//     `cancelReservation` / `saveParticipantId` / `state` などが
//     グローバルスコープで参照できる状態にある。
//   - `document.modelContext` はブラウザネイティブ実装があればそれを、
//     無ければ webmcp-bridge-extension が polyfill を注入する。
// ---------------------------------------------------------------

(function () {
  "use strict";

  const PARTICIPANT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
  const SEAT_ID_RE = /^[A-J]-([1-9]|10)$/;

  function ensureParticipantId() {
    if (!state.participantId) {
      throw new Error(
        "参加者IDが設定されていません。先に set_participant_id ツール、または画面上の入力欄で設定してください。",
      );
    }
  }

  // ---------------------------------------------------------------
  // 命令型 (document.modelContext.registerTool)
  // ---------------------------------------------------------------

  async function execSeatSummary() {
    const data = await getSeats();
    return {
      summary: data.summary,
      layout: data.layout,
      eventName: data.eventName,
      updatedAt: data.updatedAt,
    };
  }

  async function execSeatList(input) {
    const filter = (input && input.filter) || "all";
    const data = await getSeats();
    let seats = data.seats;
    if (filter === "available") {
      seats = seats.filter((s) => s.status === "available");
    } else if (filter === "reserved") {
      seats = seats.filter((s) => s.status === "reserved");
    } else if (filter === "disabled") {
      seats = seats.filter((s) => s.status === "disabled");
    }
    return {
      count: seats.length,
      seats: seats.map((s) => ({
        id: s.id,
        row: s.row,
        number: s.number,
        status: s.status,
      })),
    };
  }

  async function execMyReservation() {
    ensureParticipantId();
    const reservation = await getMyReservation();
    return { reservation };
  }

  async function execCancelReservation() {
    ensureParticipantId();
    const seat = await cancelReservation();
    state.myReservation = null;
    await refreshSeats();
    return { ok: true, seat };
  }

  async function execSetParticipantId(input) {
    const id = input && input.participantId;
    if (typeof id !== "string" || !PARTICIPANT_ID_RE.test(id)) {
      throw new Error(
        "participantId は英数字/ハイフン/アンダースコアのみ、1-64 文字である必要があります。",
      );
    }
    saveParticipantId(id);
    renderIdentity();
    await refreshMyReservation();
    return { ok: true, participantId: id };
  }

  const IMPERATIVE_TOOLS = [
    {
      name: "seat_summary",
      description: "会場全体の席サマリー (合計/空席/予約済/使用禁止) を取得する。",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: execSeatSummary,
    },
    {
      name: "seat_list",
      description:
        "全席の状態一覧を取得する。filter を指定すると空席のみ、予約済のみなど絞り込める。",
      inputSchema: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            enum: ["all", "available", "reserved", "disabled"],
            description: "取得する席の絞り込み条件。既定は all。",
          },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: execSeatList,
    },
    {
      name: "my_reservation",
      description: "現在の参加者の予約状況を取得する。",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: execMyReservation,
    },
    {
      name: "cancel_reservation",
      description: "現在の参加者の予約を解除する。",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false },
      execute: execCancelReservation,
    },
    {
      name: "set_participant_id",
      description:
        "参加者IDを設定する。未設定の場合、この後の予約系ツールを呼ぶ前に必要。",
      inputSchema: {
        type: "object",
        properties: {
          participantId: {
            type: "string",
            description: "英数字/ハイフン/アンダースコアのみ、1-64 文字。",
          },
        },
        required: ["participantId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: execSetParticipantId,
    },
  ];

  async function registerImperativeTools() {
    if (!document.modelContext || typeof document.modelContext.registerTool !== "function") {
      console.warn("[webmcp] document.modelContext.registerTool が見つかりません。");
      return;
    }
    for (const tool of IMPERATIVE_TOOLS) {
      try {
        await document.modelContext.registerTool(tool);
      } catch (err) {
        // 既に登録されている等のエラーは READY (再登録) の場合以外は握りつぶさない
        if (err instanceof Error && /already registered/i.test(err.message)) {
          console.log("[webmcp] tool already registered:", tool.name);
        } else {
          console.error("[webmcp] failed to register", tool.name, err);
        }
      }
    }
    console.info("[webmcp] " + IMPERATIVE_TOOLS.length + " imperative tools registered");
  }

  // ---------------------------------------------------------------
  // 宣言型 (<form toolname tooldescription>)
  // ---------------------------------------------------------------
  //
  // フォーム自体は index.html に定義済み。
  // ここでは submit ハンドラを取り付け、agent 経由/人間経由の両方に対応する。
  //   - event.agentInvoked === true → WebMCP エージェント呼び出し
  //       preventDefault → 予約実行 → event.respondWith(結果Promise)
  //   - event.agentInvoked !== true → 人間のフォーム送信
  //       preventDefault → 予約実行 → 画面にメッセージ表示

  async function reserveViaForm(seatId, source) {
    if (typeof seatId !== "string" || !SEAT_ID_RE.test(seatId)) {
      throw new Error("seatId は 'A-5' の形式 (行A-J、席番号1-10) で指定してください。");
    }
    ensureParticipantId();
    const reservation = await reserveSeat(seatId, source);
    state.myReservation = reservation;
    state.selectedSeatId = null;
    await refreshSeats();
    return reservation;
  }

  function attachDeclarativeReserveForm() {
    const form = document.querySelector('form[toolname="reserve_seat"]');
    if (!form) {
      console.warn("[webmcp] declarative reserve_seat form not found");
      return;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const data = new FormData(event.target);
      const seatId = String(data.get("seatId") || "").trim();

      if (event.agentInvoked && typeof event.respondWith === "function") {
        // エージェント経由
        event.respondWith(
          (async () => {
            const reservation = await reserveViaForm(seatId, "webmcp");
            showMessage("success", seatId + " を予約しました (WebMCP)");
            return { ok: true, reservation };
          })().catch((err) => ({ ok: false, error: (err && err.message) || String(err) })),
        );
        return;
      }

      // 人間経由: 同じフォームを普通の予約 UI としても使えるようにする
      (async () => {
        try {
          const reservation = await reserveViaForm(seatId, "web");
          showMessage("success", seatId + " を予約しました");
          void reservation;
          form.reset();
        } catch (err) {
          const code = (err && err.code) || "ERROR";
          const message = (err && err.message) || "予約に失敗しました";
          showMessage("error", "[" + code + "] " + message);
        }
      })();
    });
  }

  // ---------------------------------------------------------------
  // 起動
  // ---------------------------------------------------------------

  function boot() {
    void registerImperativeTools();
    attachDeclarativeReserveForm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
