// Caché en memoria con TTL. Se resetea al recargar la página.
const store = new Map()
const TTL_MS = 60_000 // 1 minuto

export const cache = {
  get(key) {
    const hit = store.get(key)
    if (!hit) return null
    if (Date.now() - hit.ts > TTL_MS) {
      store.delete(key)
      return null
    }
    return hit.data
  },
  set(key, data) {
    store.set(key, { data, ts: Date.now() })
  },
  del(...keys) {
    keys.forEach(k => store.delete(k))
  },
}
