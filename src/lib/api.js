// Bridge to the Electron main process (see electron/preload.js). Outside
// Electron (plain browser preview) it falls back to a read-only demo snapshot.

const fallback = {
  async invoke(channel) {
    if (channel === 'state:get') {
      const res = await fetch('./mock-snapshot.json');
      return res.json();
    }
    console.info('[preview] ignored', channel);
    return null;
  },
  on: () => () => {},
  closeWindow: () => window.close()
};

export const api = window.sf || fallback;
export const invoke = (channel, ...args) => api.invoke(channel, ...args);
export const on = (channel, cb) => api.on(channel, cb);
