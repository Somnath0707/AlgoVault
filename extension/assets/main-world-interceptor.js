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

  window.fetch = async function() {
    var args = Array.from(arguments);
    var url = normalizeUrl(args[0]);

    // Capture the submitted code so we can relay it later
    if (/\/submit\/?$/.test(url) || /\/problems\/[^\/]+\/submit\/?/.test(url)) {
      try {
        var init = args[1];
        if (init && init.body) {
          var body = JSON.parse(init.body);
          if (body && body.typed_code) {
            window.__ALGOVAULT_LAST_SUBMITTED_CODE__ = { code: body.typed_code, lang: body.lang };
          }
        }
      } catch (e) {}
    }

    var response = await originalFetch.apply(this, args);

    // Intercept submission check polling responses
    if (/\/submissions\/detail\/\d+\/check/.test(url)) {
      response.clone().json().then(function(data) {
        var body = data && data.data ? data.data : data;
        if (!body || body.state !== 'SUCCESS') return;
        var match = url.match(/\/submissions\/detail\/(\d+)\/check/);
        var submissionId = match ? match[1] : undefined;
        // Deduplicate: LeetCode polls /check repeatedly; only fire once per submission
        if (submissionId && submissionId === lastSeenSubmissionId) return;
        lastSeenSubmissionId = submissionId;
        var detail = {
          submissionId: submissionId,
          statusCode: body.status_code,
          statusDisplay: body.status_msg || body.status_runtime || undefined,
          runtime: body.status_runtime,
          memory: body.status_memory,
          totalCorrect: body.total_correct,
          totalTestcases: body.total_testcases,
          lang: body.lang,
          code: window.__ALGOVAULT_LAST_SUBMITTED_CODE__ ? window.__ALGOVAULT_LAST_SUBMITTED_CODE__.code : undefined,
          codeLang: window.__ALGOVAULT_LAST_SUBMITTED_CODE__ ? window.__ALGOVAULT_LAST_SUBMITTED_CODE__.lang : undefined
        };
        // postMessage crosses the MAIN→ISOLATED world boundary (CustomEvent does NOT)
        window.postMessage({ type: 'AV_SUBMISSION_RESULT', detail: detail }, '*');
      }).catch(function() {});
    }

    return response;
  };
})();
