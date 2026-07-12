// 席予約画面で使う最小限の API と描画処理

const API_BASE_URL = "http://localhost:8787";

function participantId() {
  return document.querySelector("#participant-id").value.trim();
}

async function apiFetch(path, options = {}) {
  const headers = { Accept: "application/json", ...options.headers };

  if (participantId()) {
    headers["X-Participant-ID"] = participantId();
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

async function getMyReservation() {
  return apiFetch("/api/reservations/me");
}

async function cancelReservation() {
  return apiFetch("/api/reservations/me", { method: "DELETE" });
}

async function render() {
  try {
    const data = await getSeats();
    document.querySelector("#event-name").textContent = data.eventName || "席予約";
    document.querySelector("#summary").textContent =
      `合計 ${data.summary.total} / 空席 ${data.summary.available} / ` +
      `予約済 ${data.summary.reserved} / 使用禁止 ${data.summary.disabled}`;
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
    output.textContent = "参加者IDを入力してください。";
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

document.querySelector("#participant-id").addEventListener("change", renderMyReservation);

document.querySelector("#cancel-button").addEventListener("click", async () => {
  try {
    await cancelReservation();
    await render();
    await renderMyReservation();
  } catch (error) {
    document.querySelector("#error").textContent = error.message;
  }
});

render();
renderMyReservation();
