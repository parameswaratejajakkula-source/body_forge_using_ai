// BODY FORGE AI - localStorage database (replaces Firebase)
// Exposes the same window.BF API the pages already use, so most pages need no changes.
// NOTE: data lives only in this browser. Passwords are hashed, but this is NOT real security.

const USERS_KEY = "bf_users";      // { email: { name, email, passHash } }
const SESSION_KEY = "bf_session";  // current logged-in email
const dataKey = (email) => "bf_data_" + email; // { profile, progress, analysis, plans }

const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

async function hash(email, password) {
  const bytes = new TextEncoder().encode(email.toLowerCase() + ":" + password);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function currentEmail() { return localStorage.getItem(SESSION_KEY); }

function currentUser() {
  const email = currentEmail();
  if (!email) return null;
  const u = read(USERS_KEY, {})[email];
  return u ? { email, displayName: u.name, uid: email } : null;
}

function requireUser() {
  const email = currentEmail();
  if (!email) throw new Error("Please login first.");
  return email;
}

function getData(email) { return read(dataKey(email), { profile: null, progress: null, analysis: null, plans: {} }); }
function setData(email, data) { write(dataKey(email), data); }

const BF = {
  configured: true,
  auth: { get currentUser() { return currentUser(); } },

  // ---------- AUTH (same names as the Firebase calls used in login.html) ----------
  async createUserWithEmailAndPassword(_auth, email, password) {
    email = email.trim().toLowerCase();
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");
    const users = read(USERS_KEY, {});
    if (users[email]) throw new Error("This email is already registered. Please login.");
    users[email] = { name: "", email, passHash: await hash(email, password) };
    write(USERS_KEY, users);
    localStorage.setItem(SESSION_KEY, email);
    return { user: currentUser() };
  },

  async signInWithEmailAndPassword(_auth, email, password) {
    email = email.trim().toLowerCase();
    const users = read(USERS_KEY, {});
    const u = users[email];
    if (!u || u.passHash !== await hash(email, password)) throw new Error("Wrong email or password.");
    localStorage.setItem(SESSION_KEY, email);
    return { user: currentUser() };
  },

  async updateProfile(user, { displayName }) {
    const users = read(USERS_KEY, {});
    if (users[user.email]) { users[user.email].name = displayName; write(USERS_KEY, users); }
  },

  async waitForAuth() { return currentUser(); },

  logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "login.html";
  },

  // ---------- PROFILE ----------
  async saveUserProfile(data) {
    const email = requireUser();
    const d = getData(email);
    d.profile = { ...(d.profile || {}), ...data };
    setData(email, d);
    // keep old key in sync for any page still reading it
    localStorage.setItem("bodyForceUser", JSON.stringify(d.profile));
  },

  async getUserProfile() {
    const email = currentEmail();
    if (!email) return null;
    return getData(email).profile;
  },

  // ---------- PROGRESS ----------
  async getProgress() {
    const email = currentEmail();
    return email ? getData(email).progress : null;
  },
  async saveProgress(progress) {
    const email = requireUser();
    const d = getData(email); d.progress = progress; setData(email, d);
  },

  // ---------- BODY ANALYSIS (metadata only; photo stays in localStorage "bodyImage") ----------
  async saveAnalysis(meta) {
    const email = requireUser();
    const d = getData(email); d.analysis = meta; setData(email, d);
  },
  async getAnalysis() {
    const email = currentEmail();
    return email ? getData(email).analysis : null;
  },

  // ---------- WORKOUT / DIET PLANS ----------
  async savePlan(type, plan) {
    const email = requireUser();
    const d = getData(email); d.plans = d.plans || {}; d.plans[type] = plan; setData(email, d);
  },
  async getPlan(type) {
    const email = currentEmail();
    return email ? (getData(email).plans || {})[type] || null : null;
  }
};

window.BF = BF;

// Redirect to login on protected pages when nobody is logged in
const page = location.pathname.split("/").pop() || "index.html";
if (!["index.html", "login.html", ""].includes(page) && !currentEmail()) {
  window.location.replace("login.html");
}
