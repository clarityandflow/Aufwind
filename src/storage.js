// Persistenz-Wrapper: ersetzt window.storage aus dem Prototyp.
// Nutzt localStorage (synchron, aber async-API-kompatibel zum Prototyp).
export const storage = {
  async get(key) {
    try {
      const value = localStorage.getItem(key);
      return value == null ? null : { value };
    } catch (e) {
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  },
  async remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  },
};

// Rückwärtskompatibel: Prototyp greift auf window.storage zu.
if (typeof window !== "undefined") {
  window.storage = storage;
}
