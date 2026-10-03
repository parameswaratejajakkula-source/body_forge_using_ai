// BODY FORGE AI - Local storage database (no Firebase, no login/logout)
// All data stays in this browser. Window API: window.BF

const KEYS = {
  user: "bodyForceUser",
  progress: "bodyForceProgress",
  analysis: "bodyForceAnalysis",
  plans: "bodyForcePlans"
};

function read(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Could not save to local storage", e);
  }
}

async function saveUserProfile(data) {
  const merged = { ...(read(KEYS.user, {}) || {}), ...data };
  write(KEYS.user, merged);
  return merged;
}

async function getUserProfile() { return read(KEYS.user, null); }

async function saveProgress(progress) { write(KEYS.progress, progress); return progress; }
async function getProgress() { return read(KEYS.progress, null); }

async function saveAnalysis(data) {
  write(KEYS.analysis, { ...data, updatedAt: new Date().toISOString() });
  return data;
}

async function savePlan(type, plan) {
  const plans = read(KEYS.plans, {}) || {};
  plans[type] = plan;
  write(KEYS.plans, plans);
  return plan;
}

function waitForAuth() { return Promise.resolve(read(KEYS.user, null)); }

window.BF = {
  configured: true,
  saveUserProfile,
  getUserProfile,
  saveProgress,
  getProgress,
  saveAnalysis,
  savePlan,
  waitForAuth
};
