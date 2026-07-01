(function() {
  if (window.__ALGOVAULT_FETCH_PATCHED__) return;
  window.__ALGOVAULT_FETCH_PATCHED__ = true;

  var lastSeenSubmissionId;
  var originalFetch = window.fetch;

  function normalizeUrl(input) {
    if (typeof input === 'string') return input;
    if (input && typeof input.url === 'string') return input.url;
    return '';
  }

  function emitSubmissionResult(url, data) {
    var body = data && data.data ? data.data : data;
    if (!body || body.state !== 'SUCCESS') return;
    var match = String(url).match(/\/submissions\/detail\/(\d+)\/check/);
    var submissionId = match ? match[1] : undefined;
    if (submissionId && submissionId === lastSeenSubmissionId) return;
    lastSeenSubmissionId = submissionId;
    var captured = window.__ALGOVAULT_LAST_SUBMITTED_CODE__ || {};
    window.postMessage({
      type: 'AV_SUBMISSION_RESULT',
      detail: {
        submissionId: submissionId,
        statusCode: body.status_code,
        statusDisplay: body.status_msg || body.status_runtime || body.state || undefined,
        runtime: body.status_runtime,
        memory: body.status_memory,
        totalCorrect: body.total_correct,
        totalTestcases: body.total_testcases,
        lang: body.lang || captured.lang,
        code: body.code || body.typed_code || captured.code,
        codeLang: body.lang || captured.lang
      }
    }, '*');
  }

  // 1. Monkey-patch window.fetch
  window.fetch = async function() {
    var args = Array.from(arguments);
    var url = normalizeUrl(args[0]);
    var isSubmit = /\/submit\/?$/.test(url) || /\/problems\/[^\/]+\/submit\/?/.test(url);

    if (isSubmit) {
      try {
        var init = args[1];
        if (init && init.body) {
          var body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
          if (body && body.typed_code) {
            window.__ALGOVAULT_LAST_SUBMITTED_CODE__ = { code: body.typed_code, lang: body.lang };
          }
        } else if (args[0] && typeof args[0] === 'object' && args[0].clone) {
          // If first argument is a Request object, clone it to read body asynchronously without consuming original stream
          var clonedReq = args[0].clone();
          clonedReq.text().then(function(text) {
            try {
              var body = JSON.parse(text);
              if (body && body.typed_code) {
                window.__ALGOVAULT_LAST_SUBMITTED_CODE__ = { code: body.typed_code, lang: body.lang };
              }
            } catch (e) {}
          }).catch(function() {});
        }
      } catch (e) {
        console.warn("AlgoVault: Failed to extract fetch submission code", e);
      }
    }

    var response = await originalFetch.apply(this, args);

    // Intercept submission check polling responses
    if (/\/submissions\/detail\/\d+\/check/.test(url)) {
      response.clone().json().then(function(data) {
        emitSubmissionResult(url, data);
      }).catch(function() {});
    }

    return response;
  };

  // 2. Monkey-patch XMLHttpRequest (fallback/redundancy for older or localized clients)
  var originalXhrOpen = XMLHttpRequest.prototype.open;
  var originalXhrSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    this._method = method;
    return originalXhrOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    var url = this._url || '';
    var isSubmit = /\/submit\/?$/.test(url) || /\/problems\/[^\/]+\/submit\/?/.test(url);
    if (isSubmit && body) {
      try {
        var payload = typeof body === 'string' ? JSON.parse(body) : body;
        if (payload && payload.typed_code) {
          window.__ALGOVAULT_LAST_SUBMITTED_CODE__ = { code: payload.typed_code, lang: payload.lang };
        }
      } catch (e) {
        console.warn("AlgoVault: Failed to extract XHR submission code", e);
      }
    }
    if (/\/submissions\/detail\/\d+\/check/.test(url)) {
      this.addEventListener('loadend', function() {
        try {
          if (this.status < 200 || this.status >= 300 || !this.responseText) return;
          emitSubmissionResult(url, JSON.parse(this.responseText));
        } catch (e) {}
      });
    }
    return originalXhrSend.apply(this, arguments);
  };
})();
