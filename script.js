const STORAGE_KEY = "fitness-tracker-data-v4";
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

function formatYmd(date) {
  return date.toISOString().slice(0, 10);
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

function readData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

function writeData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getRole() {
  return localStorage.getItem(ROLE_KEY) || "";
}

function saveRole(role) {
  localStorage.setItem(ROLE_KEY, role);
  roleLockBadge.classList.remove("hidden");
}

function countMissedDays(data, userKey, untilDayId) {
  let missed = 0;
  for (const day of getDaysFromStart()) {
    if (day.id >= untilDayId) {
      break;
    }
    const entry = data[day.id]?.[userKey];
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
    if (day.id !== todayId) {
      option.disabled = true;
    }
    daySelect.appendChild(option);
  });

  daySelect.value = todayId;
}

function getRequiredExercises(missedDays) {
  const multiplier = missedDays + 1;
  return exerciseTemplates.map((item) => ({
    title: `${item.base * multiplier} ${item.name}`,
  }));
}

function renderChildCalendar(role, data) {
  const days = getDaysFromStart();
  const todayId = formatYmd(new Date());
  childCalendar.innerHTML = "";

  days.forEach((day) => {
    const entry = data[day.id]?.[role];
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

  const data = readData();
  const dayId = daySelect.value;
  const missedDays = countMissedDays(data, role, dayId);
  const required = getRequiredExercises(missedDays);

  debtInfo.textContent =
    missedDays > 0
      ? `Є пропуски: ${missedDays} дн. Тому сьогодні навантаження збільшене.`
      : "Пропусків нема. Сьогодні базове навантаження.";

  exerciseList.innerHTML = "";
  required.forEach((exercise, idx) => {
    const li = document.createElement("li");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = `ex-${idx}`;
    const label = document.createElement("label");
    label.htmlFor = cb.id;
    label.textContent = exercise.title;
    li.appendChild(cb);
    li.appendChild(label);
    exerciseList.appendChild(li);
  });

  renderChildCalendar(role, data);
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

function countPending(data) {
  let count = 0;
  Object.values(data).forEach((dayEntry) => {
    ["viktor", "lukyan"].forEach((userKey) => {
      if (dayEntry[userKey]?.submitted && !dayEntry[userKey]?.parentConfirmed) {
        count += 1;
      }
    });
  });
  return count;
}

function renderIncoming(data) {
  incomingList.innerHTML = "";
  const daysMap = new Map(getDaysFromStart().map((d) => [d.id, d.label]));

  const pendingItems = [];
  Object.entries(data).forEach(([dayId, dayEntry]) => {
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
  const data = readData();
  const pending = countPending(data);
  fatherNotification.textContent = `🔔 Нових повідомлень: ${pending}`;

  const role = getRole();
  if (role === "father" && pending > lastPendingCount) {
    fatherNotification.textContent = `🔔 Нове повідомлення! Очікують: ${pending}`;
  }
  lastPendingCount = pending;

  renderIncoming(data);
}

function formatStatus(dayId, userKey, entry, data) {
  const missed = countMissedDays(data, userKey, dayId);
  if (!entry?.submitted) {
    return `<span class="status-pending">❌ Не зроблено</span><span class="proof">Пропущено днів до цієї дати: ${missed}</span>`;
  }

  const proof = entry.proofName ? `Файл: ${entry.proofName}` : "Без файлу";
  if (entry.parentConfirmed) {
    return `<span class="status-ok">✅ Підтверджено батьком</span><span class="proof">${proof}</span>`;
  }

  return `<span class="status-wait">🟠 Очікує підтвердження</span><span class="proof">${proof}</span><button class="confirm-btn" data-day="${dayId}" data-user="${userKey}">Підтвердити</button>`;
}

function renderFatherTable() {
  const data = readData();
  statusTableBody.innerHTML = "";

  getDaysFromStart().forEach((day) => {
    const tr = document.createElement("tr");
    const dayCell = document.createElement("td");
    dayCell.textContent = day.label;

    const viktorCell = document.createElement("td");
    const lukyanCell = document.createElement("td");

    viktorCell.innerHTML = formatStatus(day.id, "viktor", data[day.id]?.viktor, data);
    lukyanCell.innerHTML = formatStatus(day.id, "lukyan", data[day.id]?.lukyan, data);

    tr.appendChild(dayCell);
    tr.appendChild(viktorCell);
    tr.appendChild(lukyanCell);
    statusTableBody.appendChild(tr);
  });

  renderFatherNotification();
}

function saveChildSubmission(userKey) {
  const todayId = formatYmd(new Date());
  const selectedDayId = daySelect.value;
  childMessage.textContent = "";

  if (selectedDayId !== todayId) {
    childMessage.textContent = "На минулий день відправляти не можна. Доступний лише сьогоднішній день.";
    return;
  }

  if (!allExercisesChecked()) {
    childMessage.textContent = "Познач усі вправи перед відправкою.";
    return;
  }

  const data = readData();
  const missedDays = countMissedDays(data, userKey, todayId);
  const selectedFile = proofFile.files[0];

  data[todayId] = data[todayId] || {};
  data[todayId][userKey] = {
    submitted: true,
    submittedAt: new Date().toLocaleString("uk-UA"),
    parentConfirmed: false,
    proofName: selectedFile ? selectedFile.name : "",
    loadMultiplier: missedDays + 1,
  };

  writeData(data);
  childMessage.textContent = "Вправи надіслані батькові ✅";
  clearExerciseChecks();
  renderFatherTable();
  updateChildExercisePlan();
}

function confirmSubmission(dayId, userKey) {
  const data = readData();
  const entry = data[dayId]?.[userKey];
  if (!entry?.submitted) {
    return;
  }

  entry.parentConfirmed = true;
  writeData(data);
  renderFatherTable();
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

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) {
    return;
  }

  if (getRole() === "father") {
    renderFatherTable();
  }

  if (getRole() === "viktor" || getRole() === "lukyan") {
    updateChildExercisePlan();
  }
});

buildDaySelect();
const savedRole = getRole();
if (savedRole) {
  roleSelect.value = savedRole;
  roleLockBadge.classList.remove("hidden");
  renderRole(savedRole);
}
