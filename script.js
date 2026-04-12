const STORAGE_KEY = "fitness-tracker-data-v1";

const exercises = [
  "10 віджимань",
  "20 присідань",
  "25 прес",
  "10 підстрибувань",
  "5 кіл",
];

const roleSelect = document.getElementById("roleSelect");
const childPanel = document.getElementById("childPanel");
const fatherPanel = document.getElementById("fatherPanel");
const childTitle = document.getElementById("childTitle");
const daySelect = document.getElementById("daySelect");
const exerciseList = document.getElementById("exerciseList");
const submitBtn = document.getElementById("submitBtn");
const childMessage = document.getElementById("childMessage");
const statusTableBody = document.getElementById("statusTableBody");
const proofFile = document.getElementById("proofFile");

const users = {
  viktor: "Віктор",
  lukyan: "Лукян",
};

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

function formatStatus(entry) {
  if (!entry) {
    return '<span class="status-pending">❌ Немає</span>';
  }

  const proofText = entry.proofName
    ? `Файл: ${entry.proofName}`
    : "Без файлу";
  return `<span class="status-ok">✅ Виконано</span><span class="proof">${entry.time}. ${proofText}</span>`;
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

    viktorCell.innerHTML = formatStatus(viktorEntry);
    lukyanCell.innerHTML = formatStatus(lukyanEntry);

    tr.appendChild(dayCell);
    tr.appendChild(viktorCell);
    tr.appendChild(lukyanCell);

    statusTableBody.appendChild(tr);
  });
}

function saveChildSubmission(userKey) {
  childMessage.textContent = "";

  if (!allExercisesChecked()) {
    childMessage.textContent = "Будь ласка, відміть усі вправи перед надсиланням.";
    return;
  }

  const dateKey = daySelect.value;
  const selectedFile = proofFile.files[0];

  const data = readData();
  data[dateKey] = data[dateKey] || {};
  data[dateKey][userKey] = {
    exercisesDone: true,
    time: new Date().toLocaleString("uk-UA"),
    proofName: selectedFile ? selectedFile.name : "",
  };

  writeData(data);
  childMessage.textContent = "Готово! Підтвердження збережено ✅";
  clearExerciseChecks();
  renderFatherTable();
}

roleSelect.addEventListener("change", () => {
  const role = roleSelect.value;

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
    return;
  }
});

submitBtn.addEventListener("click", () => {
  const role = roleSelect.value;
  if (role !== "viktor" && role !== "lukyan") {
    childMessage.textContent = "Спочатку обери хто ти.";
    return;
  }

  saveChildSubmission(role);
});

buildDaySelect();
buildExerciseList();
renderFatherTable();
