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

  function isRealSubmitRequest(url, body) {
    var urlStr = String(url || '');
    // If it's an interpret / run code endpoint, definitely NOT a submit
    if (urlStr.indexOf('interpret') !== -1 || urlStr.indexOf('run_code') !== -1) {
      return false;
    }
    // REST submission endpoint: /problems/<slug>/submit/
    if (/\/problems\/[^\/]+\/submit(\/|\?|$)/.test(urlStr)) {
      return true;
    }
    // Contest submission endpoint: /contest/<contest>/problems/<slug>/submit/
    if (/\/contest\/[^\/]+\/problems\/[^\/]+\/submit(\/|\?|$)/.test(urlStr)) {
      return true;
    }
    // GraphQL submission
    if (urlStr.indexOf('graphql') !== -1 && body) {
      var bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      if (bodyStr.indexOf('submitCode') !== -1 || bodyStr.indexOf('SubmitCode') !== -1) {
        if (bodyStr.indexOf('interpretSolution') === -1 && bodyStr.indexOf('runCode') === -1) {
          return true;
        }
      }
    }
    return false;
  }

  function extractCodeFromBody(body) {
    if (!body) return null;
    try {
      var parsed = typeof body === 'string' ? JSON.parse(body) : body;
      if (!parsed) return null;
      if (parsed.typed_code) return { code: parsed.typed_code, lang: parsed.lang };
      if (parsed.typedCode) return { code: parsed.typedCode, lang: parsed.lang || parsed.language };
      if (parsed.variables && (parsed.variables.typed_code || parsed.variables.typedCode)) {
        return { 
          code: parsed.variables.typed_code || parsed.variables.typedCode, 
          lang: parsed.variables.lang || parsed.variables.language 
        };
      }
    } catch(e) {}
    return null;
  }

  function emitSubmissionResult(url, data) {
    var body = data && data.data ? data.data : data;
    if (!body || body.state !== 'SUCCESS') return;

    var urlStr = String(url || '');

    // CRITICAL GUARD: Exclude Run Code (interpret_solution / testcases) responses
    if (body.run_success !== undefined || body.code_answer !== undefined || body.interpret_id !== undefined || body.expected_code_answer !== undefined) {
      window.__ALGOVAULT_IS_SUBMITTING__ = false;
      return;
    }

    // URL must not be an interpret endpoint
    if (urlStr.indexOf('interpret') !== -1) {
      window.__ALGOVAULT_IS_SUBMITTING__ = false;
      return;
    }
    
    // Only fire if the submit action was active (strictly ignores run code)
    if (!window.__ALGOVAULT_IS_SUBMITTING__) return;
    
    var match = urlStr.match(/\/submissions\/detail\/(\d+)\/check/);
    var submissionId = match ? match[1] : (body.submission_id ? String(body.submission_id) : undefined);
    if (!submissionId || !/^\d+$/.test(submissionId)) {
      window.__ALGOVAULT_IS_SUBMITTING__ = false;
      return;
    }

    if (submissionId === lastSeenSubmissionId) return;
    lastSeenSubmissionId = submissionId;

    // Reset submit state once the terminal SUCCESS state is captured
    window.__ALGOVAULT_IS_SUBMITTING__ = false;
    
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
    }, window.location.origin || '*');
  }

  // Monkey-patch window.fetch
  window.fetch = function(input, init) {
    var url = normalizeUrl(input);
    var body = init && init.body;

    if (url.indexOf('interpret') !== -1 || url.indexOf('run_code') !== -1) {
      window.__ALGOVAULT_IS_SUBMITTING__ = false;
    } else if (isRealSubmitRequest(url, body)) {
      window.__ALGOVAULT_IS_SUBMITTING__ = true;
      var extracted = extractCodeFromBody(body);
      if (extracted) {
        window.__ALGOVAULT_LAST_SUBMITTED_CODE__ = extracted;
      }
    }

    return originalFetch.apply(this, arguments).then(function(response) {
      // Real submission polling: only /submissions/detail/<id>/check/
      if (/\/submissions\/detail\/\d+\/check/.test(url)) {
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

    if (url.indexOf('interpret') !== -1 || url.indexOf('run_code') !== -1) {
      window.__ALGOVAULT_IS_SUBMITTING__ = false;
    } else if (isRealSubmitRequest(url, body)) {
      window.__ALGOVAULT_IS_SUBMITTING__ = true;
      var extracted = extractCodeFromBody(body);
      if (extracted) {
        window.__ALGOVAULT_LAST_SUBMITTED_CODE__ = extracted;
      }
    }

    if (/\/submissions\/detail\/\d+\/check/.test(url)) {
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
