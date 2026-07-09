// This file is injected into the page via web_accessible_resources
// and runs in the MAIN world context synchronously before page scripts.
(function() {
  if (window.__ALGOVAULT_FETCH_PATCHED__) return;
  window.__ALGOVAULT_FETCH_PATCHED__ = true;

  // The nonce will be read from the DOM attribute set by submission-interceptor.ts
  var nonce = document.documentElement.getAttribute("data-algovault-nonce");
  if (nonce) {
    document.documentElement.removeAttribute("data-algovault-nonce");
  } else {
    // Observe for the attribute in case isolated world script runs slightly after
    var observer = new MutationObserver(function() {
      var val = document.documentElement.getAttribute("data-algovault-nonce");
      if (val) {
        nonce = val;
        document.documentElement.removeAttribute("data-algovault-nonce");
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { attributes: true });
  }

  var lastSeenSubmissionId;
  var originalFetch = window.fetch;

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
    
    var match = String(url).match(/\/submissions\/detail\/(\d+)\/check/);
    var submissionId = match ? match[1] : undefined;
    if (submissionId && submissionId === lastSeenSubmissionId) return;
    lastSeenSubmissionId = submissionId;
    
    // If nonce wasn't available yet, try reading it now
    if (!nonce) {
      nonce = document.documentElement.getAttribute("data-algovault-nonce");
      if (nonce) document.documentElement.removeAttribute("data-algovault-nonce");
    }
    
    var captured = window.__ALGOVAULT_LAST_SUBMITTED_CODE__ || {};
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
        code: body.code || body.typed_code || captured.code,
        codeLang: body.lang || captured.lang
      }
    }, '*');
  }

  // Monkey-patch window.fetch
  window.fetch = function(input, init) {
    var url = normalizeUrl(input);
    var isSubmit = /\/submit\/?$/.test(url) || /\/problems\/[^\/]+\/submit\//.test(url);

    if (isSubmit) {
      try {
        if (init && init.body) {
          var body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
          if (body && body.typed_code) {
            window.__ALGOVAULT_LAST_SUBMITTED_CODE__ = { code: body.typed_code, lang: body.lang };
          }
        }
      } catch(e) {}
    }

    return originalFetch.apply(this, arguments).then(function(response) {
      // Match both specific check URL pattern and generic /check/ path
      if (/\/submissions\/detail\/\d+\/check/.test(url) || (typeof url === 'string' && url.indexOf('/check') !== -1)) {
        try {
          response.clone().json().then(function(data) {
            emitSubmissionResult(url, data);
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
    var isSubmit = /\/submit\/?$/.test(url) || /\/problems\/[^\/]+\/submit\//.test(url);
    if (isSubmit && body) {
      try {
        var payload = typeof body === 'string' ? JSON.parse(body) : body;
        if (payload && payload.typed_code) {
          window.__ALGOVAULT_LAST_SUBMITTED_CODE__ = { code: payload.typed_code, lang: payload.lang };
        }
      } catch(e) {}
    }
    if (/\/submissions\/detail\/\d+\/check/.test(url) || url.indexOf('/check') !== -1) {
      this.addEventListener('loadend', function() {
        try {
          if (this.status < 200 || this.status >= 300 || !this.responseText) return;
          emitSubmissionResult(url, JSON.parse(this.responseText));
        } catch(e) {}
      });
    }
    return originalXhrSend.apply(this, arguments);
  };
})();
