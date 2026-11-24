applyTheme();

const $ = (id) => document.getElementById(id);
const FILE_TYPES = ["pdf", "doc", "docx", "txt", "jpg", "jpeg", "png"];
const COLORS = { Planning: "gray", "To-do": "gray", Active: "blue", "In-Progress": "blue", Completed: "green", Done: "green" };

const user = load(KEY.users).find((u) => u.id === localStorage.getItem(KEY.session));
const projectModal = new bootstrap.Modal($("projectModal"));
const taskModal = new bootstrap.Modal($("taskModal"));

let file = null; // lampiran yang lagi ada di form task
let selectedDate = today();
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();

// ambil data punya user yang login aja
const myProjects = () => load(KEY.projects).filter((p) => p.userId === user.id);
const myTasks = () => load(KEY.tasks).filter((t) => t.userId === user.id);

const badge = (status) => `<span class="pill pill-${COLORS[status]}">${status}</span>`;

function dueText(t) {
  if (t.status !== "Done" && t.deadline < today()) return `<span class="late">Overdue: ${fmt(t.deadline)}</span>`;
  return `<span class="muted">Due ${fmt(t.deadline)}</span>`;
}

// tiap ada perubahan data, semuanya digambar ulang dari sini
function showAll() {
  showDashboard();
  showProjects();
  showTasks();
  showCalendar();
}

// ---------- dashboard ----------

function showDashboard() {
  const projects = myProjects();
  const tasks = myTasks();
  const count = (status) => tasks.filter((t) => t.status === status).length;

  $("stat-projects").textContent = projects.length;
  $("stat-todo").textContent = count("To-do");
  $("stat-progress").textContent = count("In-Progress");
  $("stat-done").textContent = count("Done");

  // yang belum selesai dan deadline-nya maksimal 7 hari lagi (yang lewat ikut masuk)
  const soon = tasks
    .filter((t) => t.status !== "Done" && t.deadline <= addDays(7))
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 5);

  let html = "";
  soon.forEach((t) => {
    const project = projects.find((p) => p.id === t.projectId);
    html += `
      <div class="d-flex justify-content-between align-items-center gap-2 p-2 px-3 cal-item" onclick="openTaskModal('${t.id}')">
        <div class="text-truncate">
          <div class="fw-semibold small text-truncate">${esc(t.title)}</div>
          <div class="muted small">${project ? esc(project.name) : "-"}</div>
        </div>
        <div class="small text-end">${dueText(t)}</div>
      </div>`;
  });
  $("upcoming-list").innerHTML = html || `<div class="empty">Nothing due soon. Go touch some grass.</div>`;
}

// ---------- projects ----------

function showProjects() {
  const tasks = myTasks();
  let html = "";

  myProjects().forEach((p) => {
    const list = tasks.filter((t) => t.projectId === p.id);
    const done = list.filter((t) => t.status === "Done").length;
    const percent = list.length ? Math.round((done / list.length) * 100) : 0;
    html += `
      <div class="col-md-6 col-xl-4">
        <div class="box project-card">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <h6 class="fw-bold mb-1">${esc(p.name)}</h6>
            ${badge(p.status)}
          </div>
          <p class="muted small clamp mb-2">${esc(p.description) || "No description"}</p>
          <div class="small muted mb-2">Due ${fmt(p.deadline)}</div>
          <div class="progress mb-1"><div class="progress-bar" style="width:${percent}%"></div></div>
          <div class="small muted mb-3">${done} of ${list.length} tasks done</div>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-main btn-sm" onclick="viewProjectTasks('${p.id}')">View tasks</button>
            <button class="btn btn-line btn-sm" onclick="openProjectModal('${p.id}')">Edit</button>
            <button class="btn btn-line btn-sm text-danger" onclick="deleteProject('${p.id}')">Delete</button>
          </div>
        </div>
      </div>`;
  });
  $("projects-grid").innerHTML = html || `<div class="col-12"><div class="box empty">No projects yet. Add your first course or group project.</div></div>`;
}

function viewProjectTasks(id) {
  $("filter-project").value = id;
  showTasks();
  $("sec-tasks").scrollIntoView({ behavior: "smooth" });
}

function openProjectModal(id) {
  $("project-form").reset();
  $("project-error").textContent = "";
  $("project-id").value = id || ""; // kosong = tambah baru, ada isi = edit
  $("projectModalTitle").textContent = id ? "Edit project" : "Add project";
  $("project-deadline").value = addDays(7);

  if (id) {
    const p = myProjects().find((x) => x.id === id);
    $("project-name").value = p.name;
    $("project-desc").value = p.description;
    $("project-deadline").value = p.deadline;
    $("project-status").value = p.status;
  }
  projectModal.show();
}

$("project-form").onsubmit = (e) => {
  e.preventDefault();
  const id = $("project-id").value;
  const data = {
    name: $("project-name").value.trim(),
    description: $("project-desc").value.trim(),
    deadline: $("project-deadline").value,
    status: $("project-status").value,
  };
  const error = (msg) => ($("project-error").textContent = msg);

  if (data.name.length < 3) return error("Project name must be at least 3 characters.");
  if (!data.deadline) return error("Deadline is required.");
  if (myProjects().find((p) => p.name.toLowerCase() === data.name.toLowerCase() && p.id !== id)) {
    return error("That project name is already in use.");
  }

  const all = load(KEY.projects);
  if (id) {
    Object.assign(all.find((p) => p.id === id), data);
  } else {
    all.push({ id: "p" + Date.now(), userId: user.id, ...data });
  }
  if (!save(KEY.projects, all)) return;

  projectModal.hide();
  showAll();
  showToast(id ? "Project updated." : "Project added.");
};

function deleteProject(id) {
  if (!confirm("Delete this project and all of its tasks?")) return;
  save(KEY.projects, load(KEY.projects).filter((p) => p.id !== id));
  save(KEY.tasks, load(KEY.tasks).filter((t) => t.projectId !== id)); // task-nya ikut kehapus
  showAll();
  showToast("Project and its tasks deleted.");
}

// ---------- tasks ----------

function showTasks() {
  const projects = myProjects();
  const allTasks = myTasks();

  // isi dropdown filter project, pilihan sebelumnya dipertahankan
  const filter = $("filter-project");
  const old = filter.value;
  filter.innerHTML = `<option value="all">All projects</option>` + projects.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
  filter.value = projects.find((p) => p.id === old) ? old : "all";

  const keyword = $("task-search").value.trim().toLowerCase();
  const status = $("filter-status").value;
  const tasks = allTasks.filter((t) => {
    return (filter.value === "all" || t.projectId === filter.value) &&
      (status === "all" || t.status === status) &&
      (t.title + " " + t.description).toLowerCase().includes(keyword);
  });

  document.querySelectorAll(".dropzone").forEach((zone) => {
    const list = tasks.filter((t) => t.status === zone.dataset.status);
    zone.previousElementSibling.querySelector(".count").textContent = list.length;

    let html = "";
    list.forEach((t) => {
      const project = projects.find((p) => p.id === t.projectId);
      const options = ["To-do", "In-Progress", "Done"].map((s) => `<option ${s === t.status ? "selected" : ""}>${s}</option>`).join("");
      html += `
        <div class="task-card" draggable="true" data-id="${t.id}">
          <div class="muted small mb-1">${project ? esc(project.name) : "-"}</div>
          <div class="fw-semibold ${t.status === "Done" ? "done-text" : ""}">${esc(t.title)}</div>
          ${t.description ? `<div class="muted small clamp">${esc(t.description)}</div>` : ""}
          ${t.file ? `<a class="small d-inline-block mt-1" href="${t.file.data}" download="${esc(t.file.name)}"><i class="bi bi-paperclip"></i> ${esc(t.file.name)}</a>` : ""}
          <div class="small mt-2">${dueText(t)}</div>
          <div class="d-flex justify-content-between align-items-center mt-2">
            <select class="form-select form-select-sm status-select" onchange="changeStatus('${t.id}', this.value)">${options}</select>
            <div>
              <button class="icon-btn" title="Edit" onclick="openTaskModal('${t.id}')"><i class="bi bi-pencil"></i></button>
              <button class="icon-btn" title="Delete" onclick="deleteTask('${t.id}')"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>`;
    });
    zone.innerHTML = html || `<div class="empty">${allTasks.length ? "No results" : "No tasks yet"}</div>`;

    // drag and drop
    zone.querySelectorAll(".task-card").forEach((card) => {
      card.ondragstart = (e) => e.dataTransfer.setData("text", card.dataset.id);
    });
    zone.ondragover = (e) => {
      e.preventDefault(); // harus ada, kalau tidak drop-nya tidak jalan
      zone.classList.add("over");
    };
    zone.ondragleave = () => zone.classList.remove("over");
    zone.ondrop = (e) => {
      e.preventDefault();
      zone.classList.remove("over");
      changeStatus(e.dataTransfer.getData("text"), zone.dataset.status);
    };
  });
}

$("task-search").oninput = showTasks;
$("filter-project").onchange = showTasks;
$("filter-status").onchange = showTasks;

function changeStatus(id, status) {
  const all = load(KEY.tasks);
  const task = all.find((t) => t.id === id);
  if (task.status === status) return;
  task.status = status;
  if (!save(KEY.tasks, all)) return;
  showAll();
  showToast("Status changed to " + status + ".");
}

function openTaskModal(id, date) {
  const projects = myProjects();
  if (projects.length === 0) {
    showToast("Create a project first, then add tasks to it.", "warning");
    openProjectModal();
    return;
  }
  $("task-form").reset();
  $("task-error").textContent = "";
  $("task-id").value = id || "";
  $("taskModalTitle").textContent = id ? "Edit task" : "Add task";
  $("task-deadline").value = date || today();
  $("task-project").innerHTML = projects.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
  if ($("filter-project").value !== "all") $("task-project").value = $("filter-project").value;
  file = null;

  if (id) {
    const t = myTasks().find((x) => x.id === id);
    $("task-project").value = t.projectId;
    $("task-title").value = t.title;
    $("task-desc").value = t.description;
    $("task-deadline").value = t.deadline;
    $("task-status").value = t.status;
    file = t.file;
  }
  showFileInfo();
  taskModal.show();
}

function showFileInfo() {
  $("task-file-current").classList.toggle("d-none", !file);
  if (file) $("task-file-name").textContent = file.name;
}

$("task-file-remove").onclick = (e) => {
  e.preventDefault();
  file = null;
  showFileInfo();
};

// cek jenis file dan ukurannya (maks 2 MB)
$("task-file").onchange = (e) => {
  const chosen = e.target.files[0];
  if (!chosen) return;
  const ext = chosen.name.split(".").pop().toLowerCase();
  let message = "";
  if (!FILE_TYPES.includes(ext)) message = "File type not allowed. Use: " + FILE_TYPES.join(", ") + ".";
  else if (chosen.size > 2 * 1024 * 1024) message = "File is too large. Max 2 MB.";

  $("task-error").textContent = message;
  if (message) e.target.value = "";
};

$("task-form").onsubmit = (e) => {
  e.preventDefault();
  if ($("task-title").value.trim().length < 3) return ($("task-error").textContent = "Task title must be at least 3 characters.");
  if (!$("task-deadline").value) return ($("task-error").textContent = "Deadline is required.");

  const chosen = $("task-file").files[0];
  if (!chosen) return saveTask(file);

  // file harus dibaca dulu jadi teks (base64) biar bisa masuk localStorage
  const reader = new FileReader();
  reader.onload = () => saveTask({ name: chosen.name, data: reader.result });
  reader.readAsDataURL(chosen);
};

function saveTask(attachment) {
  const id = $("task-id").value;
  const data = {
    projectId: $("task-project").value,
    title: $("task-title").value.trim(),
    description: $("task-desc").value.trim(),
    deadline: $("task-deadline").value,
    status: $("task-status").value,
    file: attachment,
  };

  const all = load(KEY.tasks);
  if (id) {
    Object.assign(all.find((t) => t.id === id), data);
  } else {
    all.push({ id: "t" + Date.now(), userId: user.id, ...data });
  }
  if (!save(KEY.tasks, all)) return;

  // kalender pindah ke tanggal deadline task ini
  selectedDate = data.deadline;
  calYear = Number(data.deadline.slice(0, 4));
  calMonth = Number(data.deadline.slice(5, 7)) - 1;

  taskModal.hide();
  showAll();
  showToast(id ? "Task updated." : "Task added.");
}

function deleteTask(id) {
  if (!confirm("Delete this task?")) return;
  save(KEY.tasks, load(KEY.tasks).filter((t) => t.id !== id));
  showAll();
  showToast("Task deleted.");
}

// ---------- calendar ----------

function showCalendar() {
  const tasks = myTasks();
  const projects = myProjects();
  $("cal-month-label").textContent = new Date(calYear, calMonth, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const firstDay = new Date(calYear, calMonth, 1).getDay(); // 0 = Minggu
  const totalDays = new Date(calYear, calMonth + 1, 0).getDate(); // tanggal 0 bulan depan = hari terakhir bulan ini

  let html = "<span></span>".repeat(firstDay);
  for (let d = 1; d <= totalDays; d++) {
    const date = toISO(new Date(calYear, calMonth, d));
    const due = tasks.filter((t) => t.deadline === date);
    let cls = "cal-day";
    if (date === selectedDate) cls += " selected";
    if (date === today()) cls += " today";
    if (due.length) cls += due.every((t) => t.status === "Done") ? " dot-done" : " dot-open";
    html += `<button type="button" class="${cls}" onclick="pickDate('${date}')">${d}</button>`;
  }
  $("cal-days").innerHTML = html;

  // task di tanggal yang dipilih
  $("cal-selected-label").textContent = "Due " + fmt(selectedDate);
  let list = "";
  tasks.filter((t) => t.deadline === selectedDate).forEach((t) => {
    const project = projects.find((p) => p.id === t.projectId);
    list += `
      <div class="cal-item" onclick="openTaskModal('${t.id}')">
        <div class="fw-semibold small ${t.status === "Done" ? "done-text" : ""}">${esc(t.title)}</div>
        <div class="muted small">${project ? esc(project.name) : "-"} &middot; ${t.status}</div>
      </div>`;
  });
  $("cal-day-tasks").innerHTML = list || `<div class="empty">Nothing due on this day.</div>`;

  const dueToday = tasks.filter((t) => t.deadline === today() && t.status !== "Done").length;
  $("today-card-text").textContent = dueToday ? dueToday + (dueToday === 1 ? " task is" : " tasks are") + " due today." : "Nothing due today.";
}

function pickDate(date) {
  selectedDate = date;
  showCalendar();
}

function moveMonth(step) {
  const d = new Date(calYear, calMonth + step, 1);
  calYear = d.getFullYear();
  calMonth = d.getMonth();
  showCalendar();
}
$("cal-prev").onclick = () => moveMonth(-1);
$("cal-next").onclick = () => moveMonth(1);
$("cal-today").onclick = () => {
  selectedDate = today();
  calYear = new Date().getFullYear();
  calMonth = new Date().getMonth();
  showCalendar();
};
$("cal-add-btn").onclick = (e) => {
  e.preventDefault();
  openTaskModal(null, selectedDate);
};

// ---------- sidebar, tema, logout ----------

$("toggle-sidebar").onclick = () => $("layout").classList.toggle("collapsed");

$("theme-btn").onclick = () => {
  const dark = document.documentElement.getAttribute("data-bs-theme") === "dark";
  localStorage.setItem(KEY.theme, dark ? "light" : "dark");
  applyTheme();
};

$("btn-logout").onclick = () => {
  localStorage.removeItem(KEY.session);
  location.href = "index.html";
};

// biar tombol Back setelah logout tidak bisa buka halaman ini lagi
window.addEventListener("pageshow", () => {
  if (!localStorage.getItem(KEY.session)) location.replace("index.html");
});

// ---------- mulai ----------

if (!user) {
  localStorage.removeItem(KEY.session);
  location.replace("index.html");
} else {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  $("greeting").textContent = greeting + ", " + user.name.split(" ")[0] + "!";
  $("today-text").textContent = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  $("sidebar-user").textContent = user.email;
  showAll();
}
