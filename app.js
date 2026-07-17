// 席予約画面で使う最小限の API と描画処理

const API_BASE_URL = "https://api.webmcp.gdgs.jp";
const PARTICIPANT_COOKIE_NAME = "participantId";

function participantId() {
  const prefix = `${PARTICIPANT_COOKIE_NAME}=`;
  const cookie = document.cookie.split("; ").find((item) => item.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : "";
}

function saveParticipantId(value) {
  document.cookie =
    `${PARTICIPANT_COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; SameSite=Lax`;
}

function requireParticipantId() {
  const value = participantId();
  if (!value) {
    throw new Error("先にログインしてください。");
  }
  return value;
}

function renderLoginStatus() {
  const value = participantId();
  document.querySelector("#login-status").textContent = value
    ? `ログイン中: ${value}`
    : "ログインしていません。";

  const input = document.querySelector("#participant-id");
  if (value && !input.value) {
    input.value = value;
  }
}

function seatIdInput() {
  return document.querySelector('input[name="seatId"]');
}

function selectSeat(seatId) {
  const input = seatIdInput();
  input.value = seatId;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  updateSelectedSeat();
}

function updateSelectedSeat() {
  const selectedSeatId = seatIdInput().value.trim();
  document.querySelectorAll(".seat-chip").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.seatId === selectedSeatId);
  });
}

function statusLabel(status) {
  return {
    available: "空席",
    reserved: "予約済",
    disabled: "使用禁止",
  }[status] || status;
}

function renderSeatMap(seats) {
  const seatMap = document.querySelector("#seat-map");
  const rows = new Map();

  for (const seat of seats) {
    if (!rows.has(seat.row)) {
      rows.set(seat.row, []);
    }
    rows.get(seat.row).push(seat);
  }

  seatMap.innerHTML = "";

  for (const rowName of [...rows.keys()].sort()) {
    const row = document.createElement("div");
    row.className = "seat-map-row";

    const label = document.createElement("span");
    label.className = "seat-map-row-label";
    label.textContent = rowName;
    row.append(label);

    const rowSeats = rows.get(rowName).sort((a, b) => a.number - b.number);
    for (const seat of rowSeats) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `seat-chip is-${seat.status}`;
      button.dataset.seatId = seat.id;
      button.textContent = seat.id;
      button.disabled = seat.status !== "available";
      button.setAttribute("aria-label", `${seat.id}: ${statusLabel(seat.status)}`);

      if (seat.status === "available") {
        button.addEventListener("click", () => selectSeat(seat.id));
      }

      row.append(button);
    }

    seatMap.append(row);
  }

  updateSelectedSeat();
}

async function apiFetch(path, { participantId, ...options } = {}) {
  const headers = { Accept: "application/json", ...options.headers };

  if (participantId) {
    headers["X-Participant-ID"] = participantId;
  }
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const json = await response.json();

  if (!response.ok || json.success === false) {
    throw new Error(json.error?.message || response.statusText);
  }

  return json.data;
}

async function getSeats() {
  return apiFetch("/api/seats");
}

async function reserveSeat(seatId) {
  return apiFetch("/api/reservations", {
    method: "POST",
    participantId: requireParticipantId(),
    body: { seatId, source: "webmcp" },
  });
}

async function getMyReservation() {
  return apiFetch("/api/reservations/me", {
    participantId: requireParticipantId(),
  });
}

async function cancelReservation() {
  return apiFetch("/api/reservations/me", {
    method: "DELETE",
    participantId: requireParticipantId(),
  });
}

async function render() {
  try {
    const data = await getSeats();
    document.querySelector("#event-name").textContent = data.eventName || "席予約";
    document.querySelector("#summary").textContent =
      `合計 ${data.summary.total} / 空席 ${data.summary.available} / ` +
      `予約済 ${data.summary.reserved} / 使用禁止 ${data.summary.disabled}`;
    renderSeatMap(data.seats);
    document.querySelector("#seat-list").innerHTML = data.seats
      .map((seat) => `<tr><td>${seat.id}</td><td>${seat.status}</td></tr>`)
      .join("");
    document.querySelector("#error").textContent = "";
  } catch (error) {
    document.querySelector("#error").textContent = error.message;
  }
}

async function renderMyReservation() {
  const output = document.querySelector("#my-reservation");
  const cancelButton = document.querySelector("#cancel-button");

  if (!participantId()) {
    output.textContent = "先にログインしてください。";
    cancelButton.hidden = true;
    return;
  }

  try {
    const data = await getMyReservation();
    const reservation = data.reservation;
    output.textContent = reservation ? `予約中: ${reservation.seatId}` : "予約はありません。";
    cancelButton.hidden = !reservation;
  } catch (error) {
    output.textContent = error.message;
    cancelButton.hidden = true;
  }
}

document.querySelector("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.querySelector("#participant-id");
  const value = input.value.trim();

  if (!/^[A-Za-z0-9_-]{1,64}$/.test(value)) {
    document.querySelector("#error").textContent = "参加者IDの形式が正しくありません。";
    return;
  }

  saveParticipantId(value);
  document.querySelector("#error").textContent = "";
  renderLoginStatus();
  await renderMyReservation();
});

document.querySelector("#reservation-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const task = (async () => {
    try {
      const data = await reserveSeat(seatIdInput().value.trim());
      document.querySelector("#error").textContent = "";
      await render();
      await renderMyReservation();
      return data;
    } catch (error) {
      document.querySelector("#error").textContent = error.message;
      throw error;
    }
  })();

  if (event.agentInvoked && typeof event.respondWith === "function") {
    event.respondWith(task);
  } else {
    task.catch(() => {});
  }
});

seatIdInput().addEventListener("input", updateSelectedSeat);

document.querySelector("#cancel-button").addEventListener("click", async () => {
  try {
    await cancelReservation();
    await render();
    await renderMyReservation();
  } catch (error) {
    document.querySelector("#error").textContent = error.message;
  }
});

renderLoginStatus();
render();
renderMyReservation();
