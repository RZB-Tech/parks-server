/** Fetch-based SSE client for an operator's round screen. Returns a stop function. */
export function watchAttractionRounds({ apiBase = "/api/v1", attractionID,
  getAccessToken, refresh, onError = () => {} }) {
  if (!Number.isSafeInteger(attractionID) || attractionID <= 0) throw new Error("Invalid attractionID");
  const controller = new AbortController();
  const { signal } = controller;
  let dirty = false;
  let refreshing = false;
  let refreshTimer;
  let failures = 0;

  const reportError = (error) => { if (!signal.aborted) onError(error); };
  const delay = (ms) => new Promise((resolve) => {
    if (signal.aborted) { resolve(); return; }
    const finish = () => { clearTimeout(timer); signal.removeEventListener("abort", finish); resolve(); };
    const timer = setTimeout(finish, ms);
    signal.addEventListener("abort", finish, { once: true });
  });

  const requestRefresh = () => {
    dirty = true;
    if (refreshing || signal.aborted || refreshTimer) return;
    // Briefly coalesce events (e.g. round creation plus its first payment).
    refreshTimer = setTimeout(() => {
      refreshTimer = undefined;
      void flushRefresh();
    }, 75);
  };
  const flushRefresh = async () => {
    if (refreshing || signal.aborted) return;
    refreshing = true;
    try {
      while (dirty && !signal.aborted) {
        dirty = false;
        await refresh(signal);
      }
    } catch (error) {
      reportError(error);
      dirty = true;
      if (!signal.aborted) refreshTimer = setTimeout(() => {
        refreshTimer = undefined;
        void flushRefresh();
      }, 3000);
    } finally {
      refreshing = false;
    }
  };

  const stop = () => { controller.abort(); clearTimeout(refreshTimer); };
  const consume = async (response) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffered = "";
    let eventName = "message";
    const processLine = (line) => {
      if (line === "") {
        if (eventName === "ready") { failures = 0; requestRefresh(); }
        else if (eventName === "round.changed") requestRefresh();
        eventName = "message";
      } else if (line.startsWith("event:")) eventName = line.slice(6).trim();
    };
    try {
      while (!signal.aborted) {
        const { value, done } = await reader.read();
        if (done) return;
        buffered += decoder.decode(value, { stream: true });
        let newline;
        while ((newline = buffered.indexOf("\n")) !== -1) {
          processLine(buffered.slice(0, newline).replace(/\r$/, ""));
          buffered = buffered.slice(newline + 1);
        }
        if (buffered.length > 64 * 1024) throw new Error("Oversized SSE line");
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  };

  void (async () => {
    while (!signal.aborted) {
      try {
        const token = await getAccessToken();
        if (signal.aborted) return;
        if (!token) { stop(); return; }
        const response = await fetch(`${apiBase.replace(/\/$/, "")}/attractions/${attractionID}/rounds/events`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" }, signal,
        });
        if (!response.ok) {
          await response.body?.cancel();
          const error = new Error(`Round SSE returned HTTP ${response.status}`);
          if ([400, 403, 404].includes(response.status)) { reportError(error); stop(); return; }
          throw error;
        }
        if (!response.headers.get("content-type")?.startsWith("text/event-stream")) {
          await response.body?.cancel();
          throw new Error("Round SSE returned an unexpected content type");
        }
        await consume(response);
      } catch (error) {
        reportError(error);
      }
      if (signal.aborted) return;
      await delay(Math.min(30_000, 3000 * 2 ** Math.min(failures++, 4)));
    }
  })();
  return stop;
}
