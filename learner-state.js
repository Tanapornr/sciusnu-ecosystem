(function () {
  const API_URL = "/api/submit";
  let currentUser = null;
  let progress = {};
  let favorites = [];
  let activities = [];

  function uname() {
    return (currentUser?.username || "guest").toLowerCase();
  }
  function progressKey() { return `lessonProgress_${uname()}`; }
  function activityKey() { return `activityLog_${uname()}`; }
  function favoriteKey() { return `favoriteLessons_${uname()}`; }

  function safeParse(v, fb) {
    try { return JSON.parse(v); } catch { return fb; }
  }

  async function apiPost(payload) {
    const r = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    return await r.json();
  }

  function loadLocal() {
    progress = safeParse(localStorage.getItem(progressKey()) || "{}", {});
    favorites = safeParse(localStorage.getItem(favoriteKey()) || "[]", []);
    activities = safeParse(localStorage.getItem(activityKey()) || "[]", []);
  }

  function saveLocal() {
    localStorage.setItem(progressKey(), JSON.stringify(progress || {}));
    localStorage.setItem(favoriteKey(), JSON.stringify(favorites || []));
    localStorage.setItem(activityKey(), JSON.stringify(activities || []));
  }

  async function syncFromServer() {
    try {
      const res = await apiPost({ action: "getUserState", username: currentUser.username });
      if (res && res.status === "success" && res.state) {
        if (res.state.progress && typeof res.state.progress === "object") progress = res.state.progress;
        if (Array.isArray(res.state.favorites)) favorites = res.state.favorites;
        if (Array.isArray(res.state.activities)) activities = res.state.activities;
        saveLocal();
      }
    } catch (_) {}
  }

  async function syncToServer() {
    try {
      await apiPost({
        action: "saveUserState",
        username: currentUser.username,
        state: { progress, favorites, activities }
      });
    } catch (_) {}
  }

  const api = {
    async init(user) {
      currentUser = user || {};
      loadLocal();
      await syncFromServer();
      return this;
    },
    getProgress() { return progress || {}; },
    setProgress(next) {
      progress = next || {};
      saveLocal();
      void syncToServer();
    },
    getFavorites() { return Array.isArray(favorites) ? favorites : []; },
    setFavorites(next) {
      favorites = Array.isArray(next) ? next : [];
      saveLocal();
      void syncToServer();
    },
    getActivities() { return Array.isArray(activities) ? activities : []; },
    addActivity(item) {
      const row = { time: new Date().toISOString(), ...item };
      activities = [row, ...(activities || [])].slice(0, 300);
      saveLocal();
      void syncToServer();
    }
  };

  window.LearnerState = api;
})();
