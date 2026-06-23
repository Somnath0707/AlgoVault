var e,t;"function"==typeof(e=globalThis.define)&&(t=e,e=null),function(t,n,o,r,i){var s="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{},a="function"==typeof s[r]&&s[r],u=a.cache||{},d="undefined"!=typeof module&&"function"==typeof module.require&&module.require.bind(module);function l(e,n){if(!u[e]){if(!t[e]){var o="function"==typeof s[r]&&s[r];if(!n&&o)return o(e,!0);if(a)return a(e,!0);if(d&&"string"==typeof e)return d(e);var i=Error("Cannot find module '"+e+"'");throw i.code="MODULE_NOT_FOUND",i}f.resolve=function(n){var o=t[e][1][n];return null!=o?o:n},f.cache={};var c=u[e]=new l.Module(e);t[e][0].call(c.exports,f,c,c.exports,this)}return u[e].exports;function f(e){var t=f.resolve(e);return!1===t?{}:l(t)}}l.isParcelRequire=!0,l.Module=function(e){this.id=e,this.bundle=l,this.exports={}},l.modules=t,l.cache=u,l.parent=a,l.register=function(e,n){t[e]=[function(e,t){t.exports=n},{}]},Object.defineProperty(l,"root",{get:function(){return s[r]}}),s[r]=l;for(var c=0;c<n.length;c++)l(n[c]);if(o){var f=l(o);"object"==typeof exports&&"undefined"!=typeof module?module.exports=f:"function"==typeof e&&e.amd?e(function(){return f}):i&&(this[i]=f)}}({"5FFIB":[function(e,t,n){var o=e("@parcel/transformer-js/src/esmodule-helpers.js");o.defineInteropFlag(n),o.export(n,"config",()=>r);let r={matches:["https://leetcode.com/problems/*"],run_at:"document_start"},i=document.createElement("script");function s(){return window.location.pathname.split("/")[2]}i.textContent=`
(() => {
  if (window.__ALGOVAULT_FETCH_PATCHED__) return;
  window.__ALGOVAULT_FETCH_PATCHED__ = true;

  const originalFetch = window.fetch;
  const normalizeUrl = (input) => {
    if (typeof input === "string") return input;
    if (input && typeof input.url === "string") return input.url;
    return "";
  };

  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = normalizeUrl(args[0]);
    if (/\\/submissions\\/detail\\/\\d+\\/check/.test(url)) {
      response.clone().json().then((data) => {
        const body = data && data.data ? data.data : data;
        if (!body || body.state !== "SUCCESS") return;
        const match = url.match(/\\/submissions\\/detail\\/(\\d+)\\/check/);
        window.dispatchEvent(new CustomEvent("AV_SUBMISSION_RESULT", {
          detail: {
            submissionId: match ? match[1] : undefined,
            statusCode: body.status_code,
            statusDisplay: body.status_msg || body.status_runtime || undefined,
            runtime: body.status_runtime,
            memory: body.status_memory,
            totalCorrect: body.total_correct,
            totalTestcases: body.total_testcases,
            lang: body.lang
          }
        }));
      }).catch(() => {});
    }
    return response;
  };
})();
`,(document.documentElement||document.head).appendChild(i),i.remove(),window.addEventListener("AV_SUBMISSION_RESULT",e=>{let t=s();if(!t)return;let n=e.detail||{},o={submissionId:n.submissionId,titleSlug:t,title:function(){let e=document.querySelector("a[href*='/problems/']")?.textContent;return e?.replace(/^\d+\.\s*/,"").trim()||s()}(),statusCode:n.statusCode,statusDisplay:function(e,t){if(t&&["Accepted","Wrong Answer","Time Limit Exceeded","Runtime Error","Compile Error"].includes(t))return t;switch(e){case 10:return"Accepted";case 11:return"Wrong Answer";case 14:return"Time Limit Exceeded";case 15:return"Runtime Error";case 20:return"Compile Error";default:return t}}(n.statusCode,n.statusDisplay),language:n.lang,runtimeMs:function(e){if(!e)return;let t=e.match(/\d+/);return t?Number(t[0]):void 0}(n.runtime),memoryKb:function(e){if(!e)return;let t=Number(e.replace(/[^0-9.]/g,""));if(Number.isFinite(t))return e.toLowerCase().includes("mb")?Math.round(1024*t):Math.round(t)}(n.memory),totalCorrect:n.totalCorrect,totalTestcases:n.totalTestcases,submittedAt:new Date().toISOString()};chrome.runtime.sendMessage({action:"submission_result",payload:o}),"Accepted"===o.statusDisplay&&function(e){if(document.getElementById("algovault-post-solve"))return;let t=document.createElement("div");t.id="algovault-post-solve",t.style.cssText="position:fixed;right:24px;bottom:92px;z-index:2147483647;background:#111827;color:#f9fafb;border:1px solid rgba(255,255,255,.16);box-shadow:0 18px 50px rgba(0,0,0,.35);border-radius:8px;padding:14px;font:13px system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;width:260px",t.innerHTML=`
    <div style="font-weight:700;margin-bottom:8px;">Solved. How clean was it?</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <button data-help="NONE">Solo</button>
      <button data-help="HINT">Hint</button>
      <button data-help="EDITORIAL">Editorial</button>
      <button data-help="EXTERNAL">External</button>
    </div>
  `,t.querySelectorAll("button").forEach(n=>{n.style.cssText="border:1px solid rgba(255,255,255,.16);border-radius:6px;background:#1f2937;color:#f9fafb;padding:8px;cursor:pointer;",n.addEventListener("click",()=>{chrome.runtime.sendMessage({action:"post_solve_report",payload:{titleSlug:e,helpType:n.dataset.help}}),t.remove()})}),document.body.appendChild(t)}(t)})},{"@parcel/transformer-js/src/esmodule-helpers.js":"fRZO2"}],fRZO2:[function(e,t,n){n.interopDefault=function(e){return e&&e.__esModule?e:{default:e}},n.defineInteropFlag=function(e){Object.defineProperty(e,"__esModule",{value:!0})},n.exportAll=function(e,t){return Object.keys(e).forEach(function(n){"default"===n||"__esModule"===n||t.hasOwnProperty(n)||Object.defineProperty(t,n,{enumerable:!0,get:function(){return e[n]}})}),t},n.export=function(e,t,n){Object.defineProperty(e,t,{enumerable:!0,get:n})}},{}]},["5FFIB"],"5FFIB","parcelRequiree717"),globalThis.define=t;