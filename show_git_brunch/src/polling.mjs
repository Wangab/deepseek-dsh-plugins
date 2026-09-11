const POLL_MS = 5000;
const REQUEST_TIMEOUT_MS = 4000;

/** Own visible-page refresh events and ensure only one branch request is active. */
export function createBranchPolling({
  request,
  onValue,
  document: doc = globalThis.document,
  window: win = globalThis.window,
  setInterval: startInterval = globalThis.setInterval,
  clearInterval: stopInterval = globalThis.clearInterval,
  setTimeout: startTimeout = globalThis.setTimeout,
  clearTimeout: stopTimeout = globalThis.clearTimeout,
}) {
  let disposed = false;
  let interval;
  let active;
  let generation = 0;

  const clearActive = () => {
    generation++;
    if (active) {
      active.controller.abort();
      stopTimeout(active.timeout);
      active = undefined;
    }
  };
  const refresh = () => {
    if (disposed || doc.visibilityState === 'hidden' || active) return;
    const token = ++generation;
    const controller = new AbortController();
    const timeout = startTimeout(() => {
      controller.abort();
      if (!disposed && active?.token === token) {
        active = undefined;
        onValue(null);
      }
    }, REQUEST_TIMEOUT_MS);
    active = { token, controller, timeout };
    let pending;
    try {
      pending = request(controller.signal);
    } catch {
      pending = Promise.reject(new Error('branch request failed'));
    }
    Promise.resolve(pending)
      .then(value => {
        if (!disposed && active?.token === token && !controller.signal.aborted) onValue(value);
      })
      .catch(() => {
        if (!disposed && active?.token === token && !controller.signal.aborted) onValue(null);
      })
      .finally(() => {
        if (active?.token === token) {
          stopTimeout(timeout);
          active = undefined;
        }
      });
  };
  const start = () => {
    if (disposed || doc.visibilityState === 'hidden' || interval !== undefined) return;
    refresh();
    interval = startInterval(refresh, POLL_MS);
  };
  const stop = () => {
    if (interval !== undefined) stopInterval(interval);
    interval = undefined;
    clearActive();
  };
  const visibility = () => {
    if (doc.visibilityState === 'hidden') {
      stop();
      if (!disposed) onValue(null);
    } else {
      start();
    }
  };
  const focus = () => refresh();

  doc.addEventListener('visibilitychange', visibility);
  win.addEventListener('focus', focus);
  start();

  return () => {
    if (disposed) return;
    disposed = true;
    stop();
    doc.removeEventListener('visibilitychange', visibility);
    win.removeEventListener('focus', focus);
  };
}
