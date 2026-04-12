const STORAGE_KEY = "fitness-tracker-data-v2";
const ROLE_KEY = "fitness-role-lock-v1";

const exercises = [
  "10 віджимань",
  "20 присідань",
  "25 прес",
  "10 підстрибувань",
  "5 кіл",
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
const exerciseList = document.getElementById("exerciseList");
const submitBtn = document.getElementById("submitBtn");
const childMessage = document.getElementById("childMessage");
const statusTableBody = document.getElementById("statusTableBody");
const proofFile = document.getElementById("proofFile");
const fatherNotification = document.getElementById("fatherNotification");

function getWeekDays() {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const dayNames = [
    "Понеділок",
    "Вівторок",
    "Середа",
    "Четвер",
    "Пʼятниця",
    "Субота",
    "Неділя",
  ];

  return dayNames.map((name, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const uaDate = d.toLocaleDateString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
    });
    return { id: iso, label: `${name} (${uaDate})` };
  });
}

const weekDays = getWeekDays();

function readData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

function writeData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

function buildDaySelect() {
  daySelect.innerHTML = "";
  weekDays.forEach((d) => {
    const option = document.createElement("option");
    option.value = d.id;
    option.textContent = d.label;
    daySelect.appendChild(option);
  });

  const todayIso = new Date().toISOString().slice(0, 10);
  if (weekDays.some((d) => d.id === todayIso)) {
    daySelect.value = todayIso;
  }
}

function buildExerciseList() {
  exerciseList.innerHTML = "";
  exercises.forEach((name, idx) => {
    const li = document.createElement("li");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = `ex-${idx}`;

    const label = document.createElement("label");
    label.htmlFor = cb.id;
    label.textContent = name;

    li.appendChild(cb);
    li.appendChild(label);
    exerciseList.appendChild(li);
  });
}

function clearExerciseChecks() {
  exerciseList
    .querySelectorAll("input[type='checkbox']")
    .forEach((cb) => (cb.checked = false));
  proofFile.value = "";
}

function allExercisesChecked() {
  return [...exerciseList.querySelectorAll("input[type='checkbox']")].every(
    (cb) => cb.checked
  );
}

function countPendingForFather(data) {
  let pending = 0;
  Object.values(data).forEach((dayEntry) => {
    ["viktor", "lukyan"].forEach((user) => {
      if (dayEntry[user] && dayEntry[user].submitted && !dayEntry[user].parentConfirmed) {
        pending += 1;
      }
    });
  });
  return pending;
}

function renderFatherNotification() {
  const data = readData();
  const pending = countPendingForFather(data);
  fatherNotification.textContent = `🔔 Нових повідомлень: ${pending}`;
}

function formatStatus(dayId, userKey, entry) {
  if (!entry || !entry.submitted) {
    return '<span class="status-pending">❌ Немає відправки</span>';
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
  statusTableBody.innerHTML = "";

  weekDays.forEach((day) => {
    const tr = document.createElement("tr");

    const dayCell = document.createElement("td");
    dayCell.textContent = day.label;

    const viktorCell = document.createElement("td");
    const lukyanCell = document.createElement("td");

    const viktorEntry = data[day.id]?.viktor;
    const lukyanEntry = data[day.id]?.lukyan;

    viktorCell.innerHTML = formatStatus(day.id, "viktor", viktorEntry);
    lukyanCell.innerHTML = formatStatus(day.id, "lukyan", lukyanEntry);

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

  const selectedFile = proofFile.files[0];
  const dayId = daySelect.value;

  const data = readData();
  data[dayId] = data[dayId] || {};

  data[dayId][userKey] = {
    submitted: true,
    submittedAt: new Date().toLocaleString("uk-UA"),
    parentConfirmed: false,
    parentConfirmedAt: "",
    proofName: selectedFile ? selectedFile.name : "",
  };

  writeData(data);
  childMessage.textContent = "Відправлено! Батько отримав повідомлення 🔔";
  clearExerciseChecks();
  renderFatherTable();
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
buildExerciseList();

const lockedRole = getLockedRole();
if (lockedRole) {
  lockRole(lockedRole);
  renderRole(lockedRole);
}
