// This file is injected into the page via web_accessible_resources
// and runs in the MAIN world context synchronously before page scripts.
(function() {
  if (window.__ALGOVAULT_FETCH_PATCHED__) return;
  window.__ALGOVAULT_FETCH_PATCHED__ = true;

  // Read or establish nonce without removing it from DOM
  function getOrSetNonce() {
    var val = document.documentElement.getAttribute("data-algovault-nonce");
    if (!val) {
      val = (typeof crypto !== "undefined" && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2) + Date.now().toString(36);
      document.documentElement.setAttribute("data-algovault-nonce", val);
    }
    return val;
  }
  var nonce = getOrSetNonce();

  var lastSeenSubmissionId;
  var originalFetch = window.fetch;
  window.__ALGOVAULT_IS_SUBMITTING__ = false;

  function normalizeUrl(input) {
    if (typeof input === 'string') return input;
    if (input) {
      if (typeof input.url === 'string') return input.url;
      if (typeof input.href === 'string') return input.href;
      if (typeof input.toString === 'function') return input.toString();
    }
    return '';
  }

  function emitSubmissionResult(url, data) {
    var body = data && data.data ? data.data : data;
    if (!body || body.state !== 'SUCCESS') return;
    
    // CRITICAL GUARD: Exclude Run Code (interpret_solution / testcases) responses
    if (body.run_success !== undefined || body.code_answer !== undefined || body.interpret_id !== undefined || body.expected_code_answer !== undefined) {
      window.__ALGOVAULT_IS_SUBMITTING__ = false;
      return;
    }

    var urlStr = String(url || '');
    if (urlStr.indexOf('interpret') !== -1 || urlStr.indexOf('run_code') !== -1) {
      window.__ALGOVAULT_IS_SUBMITTING__ = false;
      return;
    }

    // Only fire if the submit action was active (ignores run code)
    if (!window.__ALGOVAULT_IS_SUBMITTING__) return;
    
    var match = urlStr.match(/\/submissions\/detail\/(\d+)\/check/);
    var submissionId = match ? match[1] : (body.submission_id ? String(body.submission_id) : undefined);
    if (submissionId && submissionId === lastSeenSubmissionId) return;
    if (submissionId) lastSeenSubmissionId = submissionId;

    // Reset submit state once the terminal SUCCESS state is captured
    window.__ALGOVAULT_IS_SUBMITTING__ = false;
    
    nonce = getOrSetNonce();
    
    var captured = window.__ALGOVAULT_LAST_SUBMITTED_CODE__ || {};
    var rawCode = body.code || body.typed_code || captured.code;
    var code = typeof rawCode === 'string' && rawCode.length <= 250000 ? rawCode : undefined;

    window.postMessage({
      type: 'AV_SUBMISSION_RESULT',
      nonce: nonce,
      detail: {
        submissionId: submissionId,
        statusCode: body.status_code,
        statusDisplay: body.status_msg || body.status_runtime || body.state || undefined,
        runtime: body.status_runtime,
        memory: body.status_memory,
        totalCorrect: body.total_correct,
        totalTestcases: body.total_testcases,
        lang: body.lang || captured.lang,
        code: code,
        codeLang: body.lang || captured.lang
      }
    }, window.location.origin || '*');
  }

  // Monkey-patch window.fetch
  window.fetch = function(input, init) {
    var url = normalizeUrl(input);
    var urlStr = String(url || '');

    if (urlStr.indexOf('interpret') !== -1 || urlStr.indexOf('run_code') !== -1) {
      window.__ALGOVAULT_IS_SUBMITTING__ = false;
    } else if (/\/submit(\/|\?|$)/.test(urlStr)) {
      window.__ALGOVAULT_IS_SUBMITTING__ = true;
      try {
        if (init && init.body) {
          var body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
          if (body && (body.typed_code || body.code)) {
            window.__ALGOVAULT_LAST_SUBMITTED_CODE__ = { code: body.typed_code || body.code, lang: body.lang };
          }
        }
      } catch(e) {}
    }

    return originalFetch.apply(this, arguments).then(function(response) {
      // Match both specific check URL pattern and generic /check/ path
      if (/\/submissions\/detail\/\d+\/check/.test(urlStr) || urlStr.indexOf('/check') !== -1) {
        try {
          response.clone().json().then(function(data) {
            emitSubmissionResult(urlStr, data);
          }).catch(function() {});
        } catch(e) {}
      }
      return response;
    });
  };

  // Monkey-patch XMLHttpRequest
  var originalXhrOpen = XMLHttpRequest.prototype.open;
  var originalXhrSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._avUrl = typeof url === 'string' ? url : (url && url.href ? url.href : String(url));
    this._avMethod = method;
    return originalXhrOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    var url = this._avUrl || '';
    var urlStr = String(url || '');

    if (urlStr.indexOf('interpret') !== -1 || urlStr.indexOf('run_code') !== -1) {
      window.__ALGOVAULT_IS_SUBMITTING__ = false;
    } else if (/\/submit(\/|\?|$)/.test(urlStr)) {
      window.__ALGOVAULT_IS_SUBMITTING__ = true;
      if (body) {
        try {
          var payload = typeof body === 'string' ? JSON.parse(body) : body;
          if (payload && (payload.typed_code || payload.code)) {
            window.__ALGOVAULT_LAST_SUBMITTED_CODE__ = { code: payload.typed_code || payload.code, lang: payload.lang };
          }
        } catch(e) {}
      }
    }
    if (/\/submissions\/detail\/\d+\/check/.test(urlStr) || urlStr.indexOf('/check') !== -1) {
      this.addEventListener('loadend', function() {
        try {
          if (this.status < 200 || this.status >= 300 || !this.responseText) return;
          emitSubmissionResult(urlStr, JSON.parse(this.responseText));
        } catch(e) {}
      });
    }
    return originalXhrSend.apply(this, arguments);
  };
})();
