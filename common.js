// fungsi bantu yang dipakai di semua halaman

const KEY = {
  users: "tm_users",
  session: "tm_session",
  projects: "tm_projects",
  tasks: "tm_tasks",
  theme: "tm_theme",
};

function load(key) {
  return JSON.parse(localStorage.getItem(key)) || [];
}

// localStorage bisa penuh (apalagi kalau ada lampiran), jadi dicek
function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    showToast("Storage is full. Remove some attachments first.", "danger");
    return false;
  }
}

// pakai jam lokal, kalau pakai toISOString hasilnya UTC dan bisa mundur sehari
function toISO(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function today() {
  return toISO(new Date());
}

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toISO(d);
}

function fmt(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// biar teks dari user tidak dibaca sebagai HTML
function esc(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML.replace(/"/g, "&quot;");
}

function showToast(message, type = "success") {
  let area = document.getElementById("toast-area");
  if (!area) {
    area = document.createElement("div");
    area.id = "toast-area";
    area.className = "toast-container position-fixed top-0 end-0 p-3";
    document.body.appendChild(area);
  }
  const toast = document.createElement("div");
  toast.className = "toast border-0 text-bg-" + type;
  toast.innerHTML = '<div class="toast-body">' + esc(message) + "</div>";
  area.appendChild(toast);
  new bootstrap.Toast(toast, { delay: 3000 }).show();
  toast.addEventListener("hidden.bs.toast", () => toast.remove());
}

function applyTheme() {
  document.documentElement.setAttribute("data-bs-theme", localStorage.getItem(KEY.theme) || "light");
}
