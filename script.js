const ROLE_KEY = "fitness-last-role-v1";
const START_DATE = "2026-04-12";

const exerciseTemplates = [
  { name: "віджимань", base: 10 },
  { name: "присідань", base: 20 },
  { name: "прес", base: 25 },
  { name: "підстрибувань", base: 10 },
  { name: "кіл", base: 5 },
];

const users = {
  viktor: "Віктор",
  lukyan: "Лукян",
};

const roleSelect = document.getElementById("roleSelect");
const roleLockBadge = document.getElementById("roleLockBadge");
const childPanel = document.getElementById("childPanel");
const fatherPanel = document.getElementById("fatherPanel");
const childTitle = document.getElementById("childTitle");
const daySelect = document.getElementById("daySelect");
const debtInfo = document.getElementById("debtInfo");
const childCalendar = document.getElementById("childCalendar");
const exerciseList = document.getElementById("exerciseList");
const submitBtn = document.getElementById("submitBtn");
const childMessage = document.getElementById("childMessage");
const statusTableBody = document.getElementById("statusTableBody");
const proofFile = document.getElementById("proofFile");
const fatherNotification = document.getElementById("fatherNotification");
const incomingList = document.getElementById("incomingList");

let lastPendingCount = 0;
let appData = { days: {} };

function formatYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseYmd(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function getDaysFromStart() {
  const start = parseYmd(START_DATE);
  const today = parseYmd(formatYmd(new Date()));
  const dayNames = [
    "Неділя",
    "Понеділок",
    "Вівторок",
    "Середа",
    "Четвер",
    "Пʼятниця",
    "Субота",
  ];

  const days = [];
  const current = new Date(start);
  while (current <= today) {
    const id = formatYmd(current);
    const display = current.toLocaleDateString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    days.push({ id, label: `${dayNames[current.getDay()]} (${display})` });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

async function fetchData() {
  const response = await fetch("/api/data", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Не вдалося завантажити дані з сервера");
  }
  appData = await response.json();
}

async function submitToServer(dayId, userKey, proofName, loadMultiplier) {
  const response = await fetch("/api/submission", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dayId, userKey, proofName, loadMultiplier }),
  });
  if (!response.ok) {
    throw new Error("Помилка відправки на сервер");
  }
  appData = await response.json();
}

async function confirmOnServer(dayId, userKey) {
  const response = await fetch("/api/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dayId, userKey }),
  });
  if (!response.ok) {
    throw new Error("Помилка підтвердження");
  }
  appData = await response.json();
}

function getRole() {
  return localStorage.getItem(ROLE_KEY) || "";
}

function saveRole(role) {
  localStorage.setItem(ROLE_KEY, role);
  roleLockBadge.classList.remove("hidden");
}

function countMissedDays(userKey, untilDayId) {
  let missed = 0;
  for (const day of getDaysFromStart()) {
    if (day.id >= untilDayId) {
      break;
    }
    const entry = appData.days?.[day.id]?.[userKey];
    if (!entry || !entry.submitted) {
      missed += 1;
    }
  }
  return missed;
}

function buildDaySelect() {
  const days = getDaysFromStart();
  const todayId = formatYmd(new Date());
  daySelect.innerHTML = "";
  days.forEach((day) => {
    const option = document.createElement("option");
    option.value = day.id;
    option.textContent = day.label;
    daySelect.appendChild(option);
  });
  daySelect.value = todayId;
}

function getRequiredExercises(missedDays) {
  const multiplier = missedDays + 1;
  return exerciseTemplates.map((item) => `${item.base * multiplier} ${item.name}`);
}

function renderChildCalendar(role) {
  const days = getDaysFromStart();
  const todayId = formatYmd(new Date());
  childCalendar.innerHTML = "";

  days.forEach((day) => {
    const entry = appData.days?.[day.id]?.[role];
    const isDone = Boolean(entry?.submitted);
    const item = document.createElement("div");
    item.className = `calendar-item ${isDone ? "done" : "missed"} ${day.id === todayId ? "today" : ""}`;
    item.innerHTML = `<strong>${day.label}</strong><br>${isDone ? "✅ Зроблено" : "❌ Не зроблено"}`;
    childCalendar.appendChild(item);
  });
}

function updateChildExercisePlan() {
  const role = getRole();
  if (role !== "viktor" && role !== "lukyan") {
    return;
  }

  const dayId = daySelect.value;
  const missedDays = countMissedDays(role, dayId);
  const required = getRequiredExercises(missedDays);

  debtInfo.textContent =
    missedDays > 0
      ? `Є пропуски: ${missedDays} дн. Тому навантаження збільшене.`
      : "Пропусків нема. Базове навантаження.";

  exerciseList.innerHTML = "";
  required.forEach((exercise, idx) => {
    const li = document.createElement("li");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = `ex-${idx}`;
    const label = document.createElement("label");
    label.htmlFor = cb.id;
    label.textContent = exercise;
    li.appendChild(cb);
    li.appendChild(label);
    exerciseList.appendChild(li);
  });

  renderChildCalendar(role);
}

function allExercisesChecked() {
  return [...exerciseList.querySelectorAll("input[type='checkbox']")].every((cb) => cb.checked);
}

function clearExerciseChecks() {
  exerciseList.querySelectorAll("input[type='checkbox']").forEach((cb) => {
    cb.checked = false;
  });
  proofFile.value = "";
}

function countPending() {
  let count = 0;
  Object.values(appData.days || {}).forEach((dayEntry) => {
    ["viktor", "lukyan"].forEach((userKey) => {
      if (dayEntry[userKey]?.submitted && !dayEntry[userKey]?.parentConfirmed) {
        count += 1;
      }
    });
  });
  return count;
}

function renderIncoming() {
  incomingList.innerHTML = "";
  const daysMap = new Map(getDaysFromStart().map((d) => [d.id, d.label]));
  const pendingItems = [];

  Object.entries(appData.days || {}).forEach(([dayId, dayEntry]) => {
    ["viktor", "lukyan"].forEach((userKey) => {
      const entry = dayEntry[userKey];
      if (entry?.submitted && !entry.parentConfirmed) {
        pendingItems.push(`${users[userKey]}: ${daysMap.get(dayId) || dayId}`);
      }
    });
  });

  if (pendingItems.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Нових повідомлень немає.";
    incomingList.appendChild(li);
    return;
  }

  pendingItems.forEach((msg) => {
    const li = document.createElement("li");
    li.textContent = `🔔 ${msg}`;
    incomingList.appendChild(li);
  });
}

function renderFatherNotification() {
  const pending = countPending();
  fatherNotification.textContent = `🔔 Нових повідомлень: ${pending}`;
  if (getRole() === "father" && pending > lastPendingCount) {
    fatherNotification.textContent = `🔔 Нове повідомлення! Очікують: ${pending}`;
  }
  lastPendingCount = pending;
  renderIncoming();
}

function formatStatus(dayId, userKey, entry) {
  const missed = countMissedDays(userKey, dayId);
  if (!entry?.submitted) {
    return `<span class="status-pending">❌ Не зроблено</span><span class="proof">Пропущено до цієї дати: ${missed} дн.</span>`;
  }

  const proof = entry.proofName ? `Файл: ${entry.proofName}` : "Без файлу";
  if (entry.parentConfirmed) {
    return `<span class="status-ok">✅ Підтверджено батьком</span><span class="proof">${proof}</span>`;
  }

  return `<span class="status-wait">🟠 Очікує підтвердження</span><span class="proof">${proof}</span><button class="confirm-btn" data-day="${dayId}" data-user="${userKey}">Підтвердити</button>`;
}

function renderFatherTable() {
  statusTableBody.innerHTML = "";

  getDaysFromStart().forEach((day) => {
    const tr = document.createElement("tr");
    const dayCell = document.createElement("td");
    dayCell.textContent = day.label;

    const viktorCell = document.createElement("td");
    const lukyanCell = document.createElement("td");

    viktorCell.innerHTML = formatStatus(day.id, "viktor", appData.days?.[day.id]?.viktor);
    lukyanCell.innerHTML = formatStatus(day.id, "lukyan", appData.days?.[day.id]?.lukyan);

    tr.appendChild(dayCell);
    tr.appendChild(viktorCell);
    tr.appendChild(lukyanCell);
    statusTableBody.appendChild(tr);
  });

  renderFatherNotification();
}

async function saveChildSubmission(userKey) {
  const todayId = formatYmd(new Date());
  const selectedDayId = daySelect.value;
  childMessage.textContent = "";

  if (selectedDayId > todayId) {
    childMessage.textContent = "На майбутній день відправляти не можна.";
    return;
  }

  if (!allExercisesChecked()) {
    childMessage.textContent = "Познач усі вправи перед відправкою.";
    return;
  }

  try {
    const missedDays = countMissedDays(userKey, selectedDayId);
    const selectedFile = proofFile.files[0];
    await submitToServer(
      selectedDayId,
      userKey,
      selectedFile ? selectedFile.name : "",
      missedDays + 1
    );

    childMessage.textContent = "Вправи надіслані батькові ✅";
    clearExerciseChecks();
    renderFatherTable();
    updateChildExercisePlan();
  } catch (error) {
    childMessage.textContent = "Помилка відправки. Перевірте зʼєднання з сервером.";
  }
}

async function confirmSubmission(dayId, userKey) {
  try {
    await confirmOnServer(dayId, userKey);
    renderFatherTable();
  } catch (error) {
    fatherNotification.textContent = "⚠️ Не вдалося підтвердити";
  }
}

function renderRole(role) {
  childPanel.classList.add("hidden");
  fatherPanel.classList.add("hidden");

  if (role === "father") {
    fatherPanel.classList.remove("hidden");
    renderFatherTable();
    return;
  }

  if (role === "viktor" || role === "lukyan") {
    childPanel.classList.remove("hidden");
    childTitle.textContent = `Панель: ${users[role]}`;
    updateChildExercisePlan();
  }
}

roleSelect.addEventListener("change", () => {
  const role = roleSelect.value;
  if (!role) {
    return;
  }
  saveRole(role);
  renderRole(role);
});

daySelect.addEventListener("change", () => {
  updateChildExercisePlan();
});

submitBtn.addEventListener("click", () => {
  const role = getRole();
  if (role !== "viktor" && role !== "lukyan") {
    childMessage.textContent = "Тільки Віктор або Лукян можуть надсилати вправи.";
    return;
  }
  saveChildSubmission(role);
});

statusTableBody.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement) || !target.classList.contains("confirm-btn")) {
    return;
  }
  if (getRole() !== "father") {
    return;
  }
  confirmSubmission(target.dataset.day, target.dataset.user);
});

async function refreshDataAndRender() {
  try {
    await fetchData();
    const role = getRole();
    if (role) {
      renderRole(role);
    }
  } catch (error) {
    fatherNotification.textContent = "⚠️ Сервер недоступний";
  }
}

async function init() {
  buildDaySelect();

  const savedRole = getRole();
  if (savedRole) {
    roleSelect.value = savedRole;
    roleLockBadge.classList.remove("hidden");
  }

  await refreshDataAndRender();
  setInterval(refreshDataAndRender, 5000);
}

init();
