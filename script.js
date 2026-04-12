const STORAGE_KEY = "fitness-tracker-data-v3";
const ROLE_KEY = "fitness-role-lock-v1";
const START_DATE = "2026-03-12";

const exerciseTemplates = [
  { key: "pushups", name: "віджимань", base: 10 },
  { key: "squats", name: "присідань", base: 20 },
  { key: "abs", name: "прес", base: 25 },
  { key: "jumps", name: "підстрибувань", base: 10 },
  { key: "laps", name: "кіл", base: 5 },
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
const exerciseList = document.getElementById("exerciseList");
const submitBtn = document.getElementById("submitBtn");
const childMessage = document.getElementById("childMessage");
const statusTableBody = document.getElementById("statusTableBody");
const proofFile = document.getElementById("proofFile");
const fatherNotification = document.getElementById("fatherNotification");
const incomingList = document.getElementById("incomingList");

function formatYmd(date) {
  return date.toISOString().slice(0, 10);
}

function parseYmd(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function getDaysFromStart() {
  const start = parseYmd(START_DATE);
  const today = new Date();
  const normalizedToday = parseYmd(formatYmd(today));

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

  while (current <= normalizedToday) {
    const iso = formatYmd(current);
    const uiDate = current.toLocaleDateString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    days.push({ id: iso, label: `${dayNames[current.getDay()]} (${uiDate})` });
    current.setDate(current.getDate() + 1);
  }

  return days;
}

function getLockedRole() {
  return localStorage.getItem(ROLE_KEY) || "";
}

function lockRole(role) {
  localStorage.setItem(ROLE_KEY, role);
  roleSelect.value = role;
  roleSelect.disabled = true;
  roleLockBadge.classList.remove("hidden");
}

function readData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

function writeData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function countMissedDays(data, userKey, untilDayId) {
  const days = getDaysFromStart();
  let missed = 0;

  for (const day of days) {
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

function getRequiredExercises(missedDays) {
  const multiplier = missedDays + 1;
  return exerciseTemplates.map((exercise) => ({
    ...exercise,
    amount: exercise.base * multiplier,
  }));
}

function buildDaySelect() {
  const days = getDaysFromStart();
  daySelect.innerHTML = "";

  days.forEach((d) => {
    const option = document.createElement("option");
    option.value = d.id;
    option.textContent = d.label;
    daySelect.appendChild(option);
  });

  const todayIso = formatYmd(new Date());
  if (days.some((d) => d.id === todayIso)) {
    daySelect.value = todayIso;
  }
}

function updateChildExercisePlan() {
  const role = getLockedRole();
  if (role !== "viktor" && role !== "lukyan") {
    return;
  }

  const data = readData();
  const dayId = daySelect.value;
  const missedDays = countMissedDays(data, role, dayId);
  const requiredExercises = getRequiredExercises(missedDays);

  debtInfo.textContent =
    missedDays > 0
      ? `Ти пропустив ${missedDays} дн. Норма на цей день збільшена.`
      : "Пропусків немає. Сьогодні базова норма.";

  exerciseList.innerHTML = "";
  requiredExercises.forEach((exercise, idx) => {
    const li = document.createElement("li");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `ex-${idx}`;

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = `${exercise.amount} ${exercise.name}`;

    li.appendChild(checkbox);
    li.appendChild(label);
    exerciseList.appendChild(li);
  });
}

function allExercisesChecked() {
  return [...exerciseList.querySelectorAll("input[type='checkbox']")].every(
    (cb) => cb.checked
  );
}

function clearExerciseChecks() {
  exerciseList
    .querySelectorAll("input[type='checkbox']")
    .forEach((cb) => (cb.checked = false));
  proofFile.value = "";
}

function countPendingForFather(data) {
  let pending = 0;

  Object.values(data).forEach((dayEntry) => {
    ["viktor", "lukyan"].forEach((userKey) => {
      const entry = dayEntry[userKey];
      if (entry?.submitted && !entry.parentConfirmed) {
        pending += 1;
      }
    });
  });

  return pending;
}

function renderIncomingMessages(data) {
  incomingList.innerHTML = "";
  const days = getDaysFromStart();
  const dayMap = new Map(days.map((day) => [day.id, day.label]));
  const messages = [];

  Object.entries(data).forEach(([dayId, dayEntry]) => {
    ["viktor", "lukyan"].forEach((userKey) => {
      const entry = dayEntry[userKey];
      if (entry?.submitted && !entry.parentConfirmed) {
        messages.push(
          `${users[userKey]} надіслав вправи за ${dayMap.get(dayId) || dayId} (${entry.submittedAt})`
        );
      }
    });
  });

  if (messages.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Нових повідомлень немає.";
    incomingList.appendChild(li);
    return;
  }

  messages.forEach((msg) => {
    const li = document.createElement("li");
    li.textContent = msg;
    incomingList.appendChild(li);
  });
}

function renderFatherNotification() {
  const data = readData();
  const pending = countPendingForFather(data);
  fatherNotification.textContent = `🔔 Нових повідомлень: ${pending}`;
  renderIncomingMessages(data);
}

function formatStatus(dayId, userKey, entry, data) {
  const missed = countMissedDays(data, userKey, dayId);

  if (!entry || !entry.submitted) {
    return `<span class="status-pending">❌ Не зроблено</span><span class="proof">Борг днів до цієї дати: ${missed}</span>`;
  }

  const proofText = entry.proofName ? `Файл: ${entry.proofName}` : "Без файлу";
  const sentInfo = `Відправлено: ${entry.submittedAt}. ${proofText}`;

  if (entry.parentConfirmed) {
    return `<span class="status-ok">✅ Підтверджено батьком</span><span class="proof">${sentInfo}<br>Підтверджено: ${entry.parentConfirmedAt}</span>`;
  }

  return `<span class="status-wait">🟠 Очікує підтвердження батька</span><span class="proof">${sentInfo}</span><button class="confirm-btn" data-day="${dayId}" data-user="${userKey}">Підтвердити</button>`;
}

function renderFatherTable() {
  const data = readData();
  const days = getDaysFromStart();
  statusTableBody.innerHTML = "";

  days.forEach((day) => {
    const tr = document.createElement("tr");

    const dayCell = document.createElement("td");
    dayCell.textContent = day.label;

    const viktorCell = document.createElement("td");
    const lukyanCell = document.createElement("td");

    const viktorEntry = data[day.id]?.viktor;
    const lukyanEntry = data[day.id]?.lukyan;

    viktorCell.innerHTML = formatStatus(day.id, "viktor", viktorEntry, data);
    lukyanCell.innerHTML = formatStatus(day.id, "lukyan", lukyanEntry, data);

    tr.appendChild(dayCell);
    tr.appendChild(viktorCell);
    tr.appendChild(lukyanCell);
    statusTableBody.appendChild(tr);
  });

  renderFatherNotification();
}

function saveChildSubmission(userKey) {
  childMessage.textContent = "";

  if (!allExercisesChecked()) {
    childMessage.textContent = "Познач усі вправи перед відправкою.";
    return;
  }

  const dayId = daySelect.value;
  const selectedFile = proofFile.files[0];
  const data = readData();
  const missedDays = countMissedDays(data, userKey, dayId);

  data[dayId] = data[dayId] || {};
  data[dayId][userKey] = {
    submitted: true,
    submittedAt: new Date().toLocaleString("uk-UA"),
    parentConfirmed: false,
    parentConfirmedAt: "",
    proofName: selectedFile ? selectedFile.name : "",
    loadMultiplier: missedDays + 1,
  };

  writeData(data);
  childMessage.textContent = "Відправлено! Повідомлення для батька додано 🔔";
  clearExerciseChecks();
  renderFatherTable();
  updateChildExercisePlan();
}

function confirmSubmission(dayId, userKey) {
  const data = readData();
  const entry = data[dayId]?.[userKey];

  if (!entry || !entry.submitted) {
    return;
  }

  entry.parentConfirmed = true;
  entry.parentConfirmedAt = new Date().toLocaleString("uk-UA");

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
    childMessage.textContent = "";
    updateChildExercisePlan();
  }
}

roleSelect.addEventListener("change", () => {
  const lockedRole = getLockedRole();
  if (lockedRole) {
    roleSelect.value = lockedRole;
    return;
  }

  const selectedRole = roleSelect.value;
  if (!selectedRole) {
    return;
  }

  lockRole(selectedRole);
  renderRole(selectedRole);
});

daySelect.addEventListener("change", () => {
  updateChildExercisePlan();
});

submitBtn.addEventListener("click", () => {
  const role = getLockedRole();
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

  const role = getLockedRole();
  if (role !== "father") {
    return;
  }

  confirmSubmission(target.dataset.day, target.dataset.user);
});

buildDaySelect();

const lockedRole = getLockedRole();
if (lockedRole) {
  lockRole(lockedRole);
  renderRole(lockedRole);
}
