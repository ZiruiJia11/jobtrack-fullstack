(() => {
  const REQUEST_TYPE = "JOBTRACK_IMPORT_REQUEST";
  const RESPONSE_TYPE = "JOBTRACK_IMPORT_RESPONSE";

  function markReady() {
    if (!document.documentElement) return;
    document.documentElement.dataset.jobtrackImporter = "ready";
    window.postMessage({ source: "jobtrack-extension", type: "JOBTRACK_EXTENSION_READY" }, location.origin);
  }

  markReady();
  document.addEventListener("DOMContentLoaded", markReady, { once: true });

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const message = event.data;
    if (message?.source !== "jobtrack" || message.type !== REQUEST_TYPE) return;
    if (typeof message.requestId !== "string" || typeof message.url !== "string") return;

    chrome.runtime.sendMessage(
      { type: REQUEST_TYPE, requestId: message.requestId, url: message.url },
      (response) => {
        const runtimeError = chrome.runtime.lastError;
        window.postMessage(
          {
            source: "jobtrack-extension",
            type: RESPONSE_TYPE,
            requestId: message.requestId,
            ok: !runtimeError && response?.ok === true,
            job: response?.job,
            error: runtimeError?.message || response?.error || "The browser helper could not import this job.",
          },
          location.origin,
        );
      },
    );
  });
})();
