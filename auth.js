applyTheme();

// kalau sudah login langsung ke dashboard
const savedId = localStorage.getItem(KEY.session);
if (savedId && load(KEY.users).find((u) => u.id === savedId)) {
  location.replace("dashboard.html");
}

const emailRule = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ganti antara form sign in dan create account
function showTab(name) {
  const isLogin = name === "login";
  document.getElementById("login-form").classList.toggle("d-none", !isLogin);
  document.getElementById("register-form").classList.toggle("d-none", isLogin);
  document.getElementById("tab-login").className = "btn btn-sm " + (isLogin ? "btn-main" : "btn-outline-main");
  document.getElementById("tab-register").className = "btn btn-sm " + (isLogin ? "btn-outline-main" : "btn-main");
  document.getElementById("auth-title").textContent = isLogin ? "Welcome back" : "Create your account";
  document.getElementById("auth-sub").textContent = isLogin ? "Sign in to pick up where you left off." : "It takes less than a minute.";
  document.getElementById("login-error").textContent = "";
  document.getElementById("reg-error").textContent = "";
}
document.getElementById("tab-login").onclick = () => showTab("login");
document.getElementById("tab-register").onclick = () => {
  document.getElementById("auth-success").textContent = "";
  showTab("register");
};

// register
document.getElementById("register-form").onsubmit = (e) => {
  e.preventDefault();
  const error = document.getElementById("reg-error");
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim().toLowerCase();
  const password = document.getElementById("reg-password").value;
  const users = load(KEY.users);

  if (name.length < 2) return (error.textContent = "Name must be at least 2 characters.");
  if (!emailRule.test(email)) return (error.textContent = "Enter a valid email address.");
  if (password.length < 6) return (error.textContent = "Password must be at least 6 characters.");
  if (password !== document.getElementById("reg-password2").value) return (error.textContent = "Passwords don't match.");
  if (users.find((u) => u.email === email)) return (error.textContent = "That email is already registered.");

  users.push({ id: "u" + Date.now(), name, email, password });
  if (!save(KEY.users, users)) return;

  document.getElementById("register-form").reset();
  showTab("login");
  document.getElementById("login-email").value = email;
  document.getElementById("auth-success").textContent = "Account created. You can sign in now.";
};

// login
document.getElementById("login-form").onsubmit = (e) => {
  e.preventDefault();
  const error = document.getElementById("login-error");
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const password = document.getElementById("login-password").value;

  const user = load(KEY.users).find((u) => u.email === email && u.password === password);
  if (!user) return (error.textContent = "Wrong email or password.");

  localStorage.setItem(KEY.session, user.id);
  location.href = "dashboard.html";
};
