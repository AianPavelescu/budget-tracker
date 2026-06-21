// localStorage-backed async shim matching the { get, set } interface App.jsx expects.
// Everything stays on-device — no network, no external services.

const memoryFallback = new Map();

function hasLocalStorage() {
  try {
    const k = "__bt_test__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

const useLS = typeof window !== "undefined" && hasLocalStorage();

export const storage = {
  async get(key) {
    if (useLS) {
      const value = window.localStorage.getItem(key);
      return value === null ? null : { value };
    }
    return memoryFallback.has(key) ? { value: memoryFallback.get(key) } : null;
  },
  async set(key, value) {
    if (useLS) window.localStorage.setItem(key, value);
    else memoryFallback.set(key, value);
    return { value };
  },
  async remove(key) {
    if (useLS) window.localStorage.removeItem(key);
    else memoryFallback.delete(key);
  },
};

export default storage;
