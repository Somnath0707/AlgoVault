(function(define){var __define; typeof define === "function" && (__define=define,define=null);
// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles

(function (modules, entry, mainEntry, parcelRequireName, globalName) {
  /* eslint-disable no-undef */
  var globalObject =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof self !== 'undefined'
      ? self
      : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
      ? global
      : {};
  /* eslint-enable no-undef */

  // Save the require from previous bundle to this closure if any
  var previousRequire =
    typeof globalObject[parcelRequireName] === 'function' &&
    globalObject[parcelRequireName];

  var cache = previousRequire.cache || {};
  // Do not use `require` to prevent Webpack from trying to bundle this call
  var nodeRequire =
    typeof module !== 'undefined' &&
    typeof module.require === 'function' &&
    module.require.bind(module);

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire =
          typeof globalObject[parcelRequireName] === 'function' &&
          globalObject[parcelRequireName];
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error("Cannot find module '" + name + "'");
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = (cache[name] = new newRequire.Module(name));

      modules[name][0].call(
        module.exports,
        localRequire,
        module,
        module.exports,
        this
      );
    }

    return cache[name].exports;

    function localRequire(x) {
      var res = localRequire.resolve(x);
      return res === false ? {} : newRequire(res);
    }

    function resolve(x) {
      var id = modules[name][1][x];
      return id != null ? id : x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [
      function (require, module) {
        module.exports = exports;
      },
      {},
    ];
  };

  Object.defineProperty(newRequire, 'root', {
    get: function () {
      return globalObject[parcelRequireName];
    },
  });

  globalObject[parcelRequireName] = newRequire;

  for (var i = 0; i < entry.length; i++) {
    newRequire(entry[i]);
  }

  if (mainEntry) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(mainEntry);

    // CommonJS
    if (typeof exports === 'object' && typeof module !== 'undefined') {
      module.exports = mainExports;

      // RequireJS
    } else if (typeof define === 'function' && define.amd) {
      define(function () {
        return mainExports;
      });

      // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }
})({"bPauw":[function(require,module,exports) {
var u = globalThis.process?.argv || [];
var h = ()=>globalThis.process?.env || {};
var B = new Set(u), _ = (e)=>B.has(e), G = u.filter((e)=>e.startsWith("--") && e.includes("=")).map((e)=>e.split("=")).reduce((e, [t, o])=>(e[t] = o, e), {});
var U = _("--dry-run"), g = ()=>_("--verbose") || h().VERBOSE === "true", N = g();
var m = (e = "", ...t)=>console.log(e.padEnd(9), "|", ...t);
var y = (...e)=>console.error("\uD83D\uDD34 ERROR".padEnd(9), "|", ...e), v = (...e)=>m("\uD83D\uDD35 INFO", ...e), f = (...e)=>m("\uD83D\uDFE0 WARN", ...e), M = 0, i = (...e)=>g() && m(`\u{1F7E1} ${M++}`, ...e);
var b = ()=>{
    let e = globalThis.browser?.runtime || globalThis.chrome?.runtime, t = ()=>setInterval(e.getPlatformInfo, 24e3);
    e.onStartup.addListener(t), t();
};
var n = {
    "isContentScript": false,
    "isBackground": true,
    "isReact": false,
    "runtimes": [
        "background-service-runtime"
    ],
    "host": "localhost",
    "port": 1815,
    "entryFilePath": "/Users/somnathghorpade/Desktop/ChromeExtension/extension/.plasmo/static/background/index.ts",
    "bundleId": "c338908e704c91f1",
    "envHash": "d99a5ffa57acd638",
    "verbose": "false",
    "secure": false,
    "serverPort": 51463
};
module.bundle.HMR_BUNDLE_ID = n.bundleId;
globalThis.process = {
    argv: [],
    env: {
        VERBOSE: n.verbose
    }
};
var D = module.bundle.Module;
function H(e) {
    D.call(this, e), this.hot = {
        data: module.bundle.hotData[e],
        _acceptCallbacks: [],
        _disposeCallbacks: [],
        accept: function(t) {
            this._acceptCallbacks.push(t || function() {});
        },
        dispose: function(t) {
            this._disposeCallbacks.push(t);
        }
    }, module.bundle.hotData[e] = void 0;
}
module.bundle.Module = H;
module.bundle.hotData = {};
var c = globalThis.browser || globalThis.chrome || null;
function R() {
    return !n.host || n.host === "0.0.0.0" ? location.protocol.indexOf("http") === 0 ? location.hostname : "localhost" : n.host;
}
function x() {
    return !n.host || n.host === "0.0.0.0" ? "localhost" : n.host;
}
function d() {
    return n.port || location.port;
}
var P = "__plasmo_runtime_page_", S = "__plasmo_runtime_script_";
var O = `${n.secure ? "https" : "http"}://${R()}:${d()}/`;
async function k(e = 1470) {
    for(;;)try {
        await fetch(O);
        break;
    } catch  {
        await new Promise((o)=>setTimeout(o, e));
    }
}
if (c.runtime.getManifest().manifest_version === 3) {
    let e = c.runtime.getURL("/__plasmo_hmr_proxy__?url=");
    globalThis.addEventListener("fetch", function(t) {
        let o = t.request.url;
        if (o.startsWith(e)) {
            let s = new URL(decodeURIComponent(o.slice(e.length)));
            s.hostname === n.host && s.port === `${n.port}` ? (s.searchParams.set("t", Date.now().toString()), t.respondWith(fetch(s).then((r)=>new Response(r.body, {
                    headers: {
                        "Content-Type": r.headers.get("Content-Type") ?? "text/javascript"
                    }
                })))) : t.respondWith(new Response("Plasmo HMR", {
                status: 200,
                statusText: "Testing"
            }));
        }
    });
}
function E(e, t) {
    let { modules: o } = e;
    return o ? !!o[t] : !1;
}
function C(e = d()) {
    let t = x();
    return `${n.secure || location.protocol === "https:" && !/localhost|127.0.0.1|0.0.0.0/.test(t) ? "wss" : "ws"}://${t}:${e}/`;
}
function L(e) {
    typeof e.message == "string" && y("[plasmo/parcel-runtime]: " + e.message);
}
function T(e) {
    if (typeof globalThis.WebSocket > "u") return;
    let t = new WebSocket(C(Number(d()) + 1));
    return t.addEventListener("message", async function(o) {
        let s = JSON.parse(o.data);
        await e(s);
    }), t.addEventListener("error", L), t;
}
function A(e) {
    if (typeof globalThis.WebSocket > "u") return;
    let t = new WebSocket(C());
    return t.addEventListener("message", async function(o) {
        let s = JSON.parse(o.data);
        if (s.type === "update" && await e(s.assets), s.type === "error") for (let r of s.diagnostics.ansi){
            let l = r.codeframe || r.stack;
            f("[plasmo/parcel-runtime]: " + r.message + `
` + l + `

` + r.hints.join(`
`));
        }
    }), t.addEventListener("error", L), t.addEventListener("open", ()=>{
        v(`[plasmo/parcel-runtime]: Connected to HMR server for ${n.entryFilePath}`);
    }), t.addEventListener("close", ()=>{
        f(`[plasmo/parcel-runtime]: Connection to the HMR server is closed for ${n.entryFilePath}`);
    }), t;
}
var w = module.bundle.parent, a = {
    buildReady: !1,
    bgChanged: !1,
    csChanged: !1,
    pageChanged: !1,
    scriptPorts: new Set,
    pagePorts: new Set
};
async function p(e = !1) {
    if (e || a.buildReady && a.pageChanged) {
        i("BGSW Runtime - reloading Page");
        for (let t of a.pagePorts)t.postMessage(null);
    }
    if (e || a.buildReady && (a.bgChanged || a.csChanged)) {
        i("BGSW Runtime - reloading CS");
        let t = await c?.tabs.query({
            active: !0
        });
        for (let o of a.scriptPorts){
            let s = t.some((r)=>r.id === o.sender.tab?.id);
            o.postMessage({
                __plasmo_cs_active_tab__: s
            });
        }
        c.runtime.reload();
    }
}
if (!w || !w.isParcelRequire) {
    b();
    let e = A(async (t)=>{
        i("BGSW Runtime - On HMR Update"), a.bgChanged ||= t.filter((s)=>s.envHash === n.envHash).some((s)=>E(module.bundle, s.id));
        let o = t.find((s)=>s.type === "json");
        if (o) {
            let s = new Set(t.map((l)=>l.id)), r = Object.values(o.depsByBundle).map((l)=>Object.values(l)).flat();
            a.bgChanged ||= r.every((l)=>s.has(l));
        }
        p();
    });
    e.addEventListener("open", ()=>{
        let t = setInterval(()=>e.send("ping"), 24e3);
        e.addEventListener("close", ()=>clearInterval(t));
    }), e.addEventListener("close", async ()=>{
        await k(), p(!0);
    });
}
T(async (e)=>{
    switch(i("BGSW Runtime - On Build Repackaged"), e.type){
        case "build_ready":
            a.buildReady ||= !0, p();
            break;
        case "cs_changed":
            a.csChanged ||= !0, p();
            break;
    }
});
c.runtime.onConnect.addListener(function(e) {
    let t = e.name.startsWith(P), o = e.name.startsWith(S);
    if (t || o) {
        let s = t ? a.pagePorts : a.scriptPorts;
        s.add(e), e.onDisconnect.addListener(()=>{
            s.delete(e);
        }), e.onMessage.addListener(function(r) {
            i("BGSW Runtime - On source changed", r), r.__plasmo_cs_changed__ && (a.csChanged ||= !0), r.__plasmo_page_changed__ && (a.pageChanged ||= !0), p();
        });
    }
});
c.runtime.onMessage.addListener(function(t) {
    return t.__plasmo_full_reload__ && (i("BGSW Runtime - On top-level code changed"), p()), !0;
});

},{}],"8oeFb":[function(require,module,exports) {
var _messaging = require("./messaging");
var _index = require("../../../background/index");

},{"./messaging":"gGuoe","../../../background/index":"leaNT"}],"gGuoe":[function(require,module,exports) {
// @ts-nocheck
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
var _getPrediction = require("~background/messages/get_prediction");
var _getPredictionDefault = parcelHelpers.interopDefault(_getPrediction);
var _openSidePanel = require("~background/messages/open_side_panel");
var _openSidePanelDefault = parcelHelpers.interopDefault(_openSidePanel);
var _syncLeetcode = require("~background/messages/sync-leetcode");
var _syncLeetcodeDefault = parcelHelpers.interopDefault(_syncLeetcode);
globalThis.__plasmoInternalPortMap = new Map();
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse)=>{
    request?.name;
    return true;
});
chrome.runtime.onMessage.addListener((request, sender, sendResponse)=>{
    switch(request.name){
        case "get_prediction":
            (0, _getPredictionDefault.default)({
                ...request,
                sender
            }, {
                send: (p)=>sendResponse(p)
            });
            break;
        case "open_side_panel":
            (0, _openSidePanelDefault.default)({
                ...request,
                sender
            }, {
                send: (p)=>sendResponse(p)
            });
            break;
        case "sync-leetcode":
            (0, _syncLeetcodeDefault.default)({
                ...request,
                sender
            }, {
                send: (p)=>sendResponse(p)
            });
            break;
        default:
            break;
    }
    return true;
});
chrome.runtime.onConnect.addListener(function(port) {
    globalThis.__plasmoInternalPortMap.set(port.name, port);
    port.onMessage.addListener(function(request) {
        port.name;
    });
});

},{"~background/messages/get_prediction":"h5Fhs","~background/messages/open_side_panel":"2rv3I","~background/messages/sync-leetcode":"hrik0","@parcel/transformer-js/src/esmodule-helpers.js":"iIXqM"}],"h5Fhs":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
var _constants = require("../../lib/constants");
const handler = async (req, res)=>{
    const { slug } = req.body;
    try {
        const response = await fetch(`${(0, _constants.BACKEND_URL)}/api/predict/${slug}`);
        if (!response.ok) throw new Error("Failed");
        res.send(await response.json());
    } catch (e) {
        // Return a fallback for demonstration purposes if backend is down
        res.send({
            solveChance: 76,
            expectedTimeMinutes: 18,
            confidence: "HIGH"
        });
    }
};
exports.default = handler;

},{"../../lib/constants":"6KjBj","@parcel/transformer-js/src/esmodule-helpers.js":"iIXqM"}],"6KjBj":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "LEETCODE_GRAPHQL_URL", ()=>LEETCODE_GRAPHQL_URL);
parcelHelpers.export(exports, "ZEROTRAC_URL", ()=>ZEROTRAC_URL);
parcelHelpers.export(exports, "BACKEND_URL", ()=>BACKEND_URL);
const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql/";
const ZEROTRAC_URL = "https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/data.json";
const BACKEND_URL = "http://localhost:8080";

},{"@parcel/transformer-js/src/esmodule-helpers.js":"iIXqM"}],"iIXqM":[function(require,module,exports) {
exports.interopDefault = function(a) {
    return a && a.__esModule ? a : {
        default: a
    };
};
exports.defineInteropFlag = function(a) {
    Object.defineProperty(a, "__esModule", {
        value: true
    });
};
exports.exportAll = function(source, dest) {
    Object.keys(source).forEach(function(key) {
        if (key === "default" || key === "__esModule" || dest.hasOwnProperty(key)) return;
        Object.defineProperty(dest, key, {
            enumerable: true,
            get: function() {
                return source[key];
            }
        });
    });
    return dest;
};
exports.export = function(dest, destName, get) {
    Object.defineProperty(dest, destName, {
        enumerable: true,
        get: get
    });
};

},{}],"2rv3I":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
const handler = async (req, res)=>{
    if (req.body?.action === "open_side_panel") {
        const senderTabId = req.sender?.tab?.id;
        if (senderTabId) {
            // Open the side panel for the current tab
            chrome.sidePanel.open({
                tabId: senderTabId
            });
            res.send({
                status: "success"
            });
        } else res.send({
            error: "No tab ID"
        });
    }
};
exports.default = handler;

},{"@parcel/transformer-js/src/esmodule-helpers.js":"iIXqM"}],"hrik0":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
var _leetcode = require("../../lib/api/leetcode");
var _constants = require("../../lib/constants");
const setStatus = (status, message, count = 0, subCount = 0)=>{
    chrome.storage.local.set({
        syncStatus: {
            status,
            message,
            count,
            subCount
        }
    });
};
const handler = async (req, res)=>{
    const { action, username } = req.body || {};
    if (action === "sync_history" && username) {
        console.log(`Starting LeetCode history sync for user: ${username}`);
        setStatus("RUNNING", "Fetching profile...", 0, 0);
        try {
            const profileData = await (0, _leetcode.fetchUserProfile)(username);
            const totalSolved = profileData.data?.matchedUser?.submitStats?.acSubmissionNum?.find((s)=>s.difficulty === "All")?.count || 0;
            const solvedProblems = [];
            let problemSkip = 0;
            const problemLimit = 50;
            while(problemSkip < totalSolved){
                setStatus("RUNNING", `Fetching problems (${problemSkip}/${totalSolved})...`, solvedProblems.length, 0);
                const problemData = await (0, _leetcode.fetchSolvedProblems)(problemSkip, problemLimit);
                const questions = problemData.data?.problemsetQuestionList?.questions || [];
                solvedProblems.push(...questions);
                problemSkip += problemLimit;
                await new Promise((r)=>setTimeout(r, 500));
            }
            const submissions = [];
            let subOffset = 0;
            const subLimit = 20;
            let hasNext = true;
            const MAX_SUBMISSIONS_FETCH = 2000;
            while(hasNext && submissions.length < MAX_SUBMISSIONS_FETCH){
                setStatus("RUNNING", `Fetching historical submissions...`, solvedProblems.length, submissions.length);
                const subData = await (0, _leetcode.fetchAllSubmissions)(subOffset, subLimit);
                const subList = subData.submissions_dump;
                if (subList && subList.length > 0) {
                    // Map REST response format to our expected format
                    const mapped = subList.map((s)=>({
                            id: s.id,
                            title: s.title,
                            titleSlug: s.title_slug,
                            statusDisplay: s.status_display,
                            lang: s.lang,
                            timestamp: s.timestamp.toString()
                        }));
                    submissions.push(...mapped);
                    hasNext = subData.has_next;
                    subOffset += subLimit;
                } else hasNext = false;
                await new Promise((r)=>setTimeout(r, 500));
            }
            setStatus("RUNNING", "Fetching contest history...", solvedProblems.length, submissions.length);
            const contestData = await (0, _leetcode.fetchContestHistory)(username);
            const contestHistory = contestData.data?.userContestRankingHistory || [];
            const contestRanking = contestData.data?.userContestRanking;
            setStatus("RUNNING", "Pushing data to AlgoVault backend...", solvedProblems.length, submissions.length);
            const payload = {
                username: username,
                profile: profileData.data?.matchedUser?.profile,
                solvedProblems: solvedProblems,
                submissions: submissions,
                contestRanking: contestRanking,
                contestHistory: contestHistory
            };
            const backendResponse = await fetch(`${(0, _constants.BACKEND_URL)}/api/sync/leetcode`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            if (!backendResponse.ok) throw new Error(`Backend rejected sync payload: ${backendResponse.status}`);
            setStatus("SUCCESS", "Data synced successfully!", solvedProblems.length, submissions.length);
            res.send({
                status: "success",
                count: solvedProblems.length,
                subCount: submissions.length
            });
        } catch (error) {
            console.error("Sync failed:", error);
            setStatus("ERROR", `Sync failed: ${error.toString()}`);
            res.send({
                status: "error",
                message: error.toString()
            });
        }
    } else res.send({
        error: "Unknown action or missing username"
    });
};
exports.default = handler;

},{"../../lib/api/leetcode":"eQAq0","../../lib/constants":"6KjBj","@parcel/transformer-js/src/esmodule-helpers.js":"iIXqM"}],"eQAq0":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "fetchGraphQL", ()=>fetchGraphQL);
parcelHelpers.export(exports, "fetchUserProfile", ()=>fetchUserProfile);
parcelHelpers.export(exports, "fetchSolvedProblems", ()=>fetchSolvedProblems);
parcelHelpers.export(exports, "fetchAllSubmissions", ()=>fetchAllSubmissions);
parcelHelpers.export(exports, "fetchContestHistory", ()=>fetchContestHistory);
var _constants = require("../constants");
const fetchGraphQL = async (query, variables = {})=>{
    const response = await fetch((0, _constants.LEETCODE_GRAPHQL_URL), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Origin": "https://leetcode.com",
            "Referer": "https://leetcode.com/"
        },
        credentials: "include",
        body: JSON.stringify({
            query,
            variables
        })
    });
    if (!response.ok) throw new Error(`LeetCode API error: ${response.status} ${response.statusText}`);
    return response.json();
};
const fetchUserProfile = async (username)=>{
    const query = `
    query userPublicProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          realName
          userAvatar
          ranking
        }
        submitStats {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
    }
  `;
    return fetchGraphQL(query, {
        username
    });
};
const fetchSolvedProblems = async (skip, limit)=>{
    const query = `
    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug
        limit: $limit
        skip: $skip
        filters: $filters
      ) {
        totalNum
        questions: data {
          frontendQuestionId: questionFrontendId
          title
          titleSlug
          difficulty
          topicTags {
            name
            id
            slug
          }
        }
      }
    }
  `;
    return fetchGraphQL(query, {
        categorySlug: "",
        skip,
        limit,
        filters: {
            status: "AC"
        }
    });
};
const fetchAllSubmissions = async (offset, limit)=>{
    const url = `https://leetcode.com/api/submissions/?offset=${offset}&limit=${limit}`;
    const response = await fetch(url, {
        method: "GET",
        credentials: "include"
    });
    if (!response.ok) throw new Error(`LeetCode API error: ${response.status} ${response.statusText}`);
    return response.json();
};
const fetchContestHistory = async (username)=>{
    const query = `
    query userContestRankingInfo($username: String!) {
      userContestRanking(username: $username) {
        attendedContestsCount
        rating
        globalRanking
        topPercentage
      }
      userContestRankingHistory(username: $username) {
        attended
        rating
        ranking
        contest {
          title
          startTime
        }
      }
    }
  `;
    return fetchGraphQL(query, {
        username
    });
};

},{"../constants":"6KjBj","@parcel/transformer-js/src/esmodule-helpers.js":"iIXqM"}],"leaNT":[function(require,module,exports) {
var _leetcode = require("../lib/api/leetcode");
chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: true
}).catch((error)=>console.error(error));
chrome.runtime.onMessage.addListener((message, sender, sendResponse)=>{
    if (message.action === "open_side_panel" && sender.tab) chrome.sidePanel.open({
        windowId: sender.tab.windowId
    });
    if (message.action === "get_prediction") {
        // 1L is temporary for testing without auth
        fetch(`http://localhost:8080/api/predictions/${message.slug}?userId=1`).then((res)=>{
            if (!res.ok) throw new Error("Failed to fetch prediction");
            return res.json();
        }).then((data)=>sendResponse(data)).catch((err)=>sendResponse({
                error: err.message
            }));
        return true; // Keep channel open
    }
    if (message.action === "sync_history") {
        runSync(message.username).catch(console.error);
        return true;
    }
    if (message.action === "get_zerotrac") {
        fetch("https://zerotrac.github.io/leetcode_problem_rating/data.json").then((res)=>res.json()).then((data)=>sendResponse(data)).catch((err)=>sendResponse({
                error: err.message
            }));
        return true;
    }
});
async function runSync(username) {
    const updateStatus = (status, msg, count = 0, subCount = 0)=>{
        chrome.storage.local.set({
            syncStatus: {
                status,
                message: msg,
                count,
                subCount
            }
        });
    };
    try {
        updateStatus("RUNNING", "Fetching user profile...");
        const profileRes = await (0, _leetcode.fetchUserProfile)(username);
        if (!profileRes.data?.matchedUser) throw new Error("User not found on LeetCode");
        const profile = profileRes.data.matchedUser;
        updateStatus("RUNNING", "Fetching solved problems...", 0, 0);
        // LeetCode's API returns all solved problems if limit is large enough
        const problemsRes = await (0, _leetcode.fetchSolvedProblems)(0, 5000);
        const problems = problemsRes.data?.problemsetQuestionList?.questions || [];
        updateStatus("RUNNING", "Fetching submissions...", problems.length, 0);
        const subsRes = await (0, _leetcode.fetchAllSubmissions)(0, 2000);
        const rawSubs = subsRes.submissions_dump || [];
        const submissions = rawSubs.map((s)=>({
                id: s.id,
                title: s.title,
                titleSlug: s.title_slug,
                statusDisplay: s.status_display,
                lang: s.lang,
                timestamp: s.timestamp.toString()
            }));
        updateStatus("RUNNING", "Fetching contest history...", problems.length, submissions.length);
        const contestRes = await (0, _leetcode.fetchContestHistory)(username);
        const contestHistory = contestRes.data?.userContestRankingHistory || [];
        const contestRanking = contestRes.data?.userContestRanking || null;
        updateStatus("RUNNING", "Pushing to AlgoVault backend...", problems.length, submissions.length);
        const payload = {
            username: username,
            profile: profile.profile,
            solvedProblems: problems,
            submissions: submissions,
            contestHistory: contestHistory,
            contestRanking: contestRanking
        };
        const response = await fetch("http://localhost:8080/api/sync/leetcode", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Backend sync failed: ${errBody}`);
        }
        updateStatus("SUCCESS", "Sync completed successfully!", problems.length, submissions.length);
    } catch (e) {
        console.error("Sync Error:", e);
        updateStatus("ERROR", e.message || "An unknown error occurred during sync");
    }
}

},{"../lib/api/leetcode":"eQAq0"}]},["bPauw","8oeFb"], "8oeFb", "parcelRequiree717")

//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QTZCLEVBQUU7UUFDdkUsTUFBTSxpQkFBaUIsV0FBVyxNQUFNLHNCQUFzQjtRQUU5RCxhQUFhLFdBQVcsbUNBQW1DLFNBQVMsUUFBUSxZQUFZO1FBRXhGLE1BQU0sVUFBVTtZQUNaLFVBQVU7WUFDVixTQUFTLFFBQVE7WUFDakIsZ0JBQWdCO1lBQ2hCLGFBQWE7WUFDYixnQkFBZ0I7WUFDaEIsZ0JBQWdCO1FBQ3BCO1FBRUEsTUFBTSxXQUFXLE1BQU0sTUFBTSwyQ0FBMkM7WUFDcEUsUUFBUTtZQUNSLFNBQVM7Z0JBQ0wsZ0JBQWdCO1lBQ3BCO1lBQ0EsTUFBTSxLQUFLLFVBQVU7UUFDekI7UUFFQSxJQUFJLENBQUMsU0FBUyxJQUFJO1lBQ2QsTUFBTSxVQUFVLE1BQU0sU0FBUztZQUMvQixNQUFNLElBQUksTUFBTSxDQUFDLHFCQUFxQixFQUFFLFFBQVEsQ0FBQztRQUNyRDtRQUVBLGFBQWEsV0FBVyxnQ0FBZ0MsU0FBUyxRQUFRLFlBQVk7SUFDekYsRUFBRSxPQUFPLEdBQVE7UUFDYixRQUFRLE1BQU0sZUFBZTtRQUM3QixhQUFhLFNBQVMsRUFBRSxXQUFXO0lBQ3ZDO0FBQ0oiLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AcGxhc21vaHEvcGFyY2VsLXJ1bnRpbWUvZGlzdC9ydW50aW1lLWIwYjU3ZmY0ZjE3NGUzYzAuanMiLCIucGxhc21vL3N0YXRpYy9iYWNrZ3JvdW5kL2luZGV4LnRzIiwiLnBsYXNtby9zdGF0aWMvYmFja2dyb3VuZC9tZXNzYWdpbmcudHMiLCJiYWNrZ3JvdW5kL21lc3NhZ2VzL2dldF9wcmVkaWN0aW9uLnRzIiwibGliL2NvbnN0YW50cy50cyIsIm5vZGVfbW9kdWxlcy9AcGFyY2VsL3RyYW5zZm9ybWVyLWpzL3NyYy9lc21vZHVsZS1oZWxwZXJzLmpzIiwiYmFja2dyb3VuZC9tZXNzYWdlcy9vcGVuX3NpZGVfcGFuZWwudHMiLCJiYWNrZ3JvdW5kL21lc3NhZ2VzL3N5bmMtbGVldGNvZGUudHMiLCJsaWIvYXBpL2xlZXRjb2RlLnRzIiwiYmFja2dyb3VuZC9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgdT1nbG9iYWxUaGlzLnByb2Nlc3M/LmFyZ3Z8fFtdO3ZhciBoPSgpPT5nbG9iYWxUaGlzLnByb2Nlc3M/LmVudnx8e307dmFyIEI9bmV3IFNldCh1KSxfPWU9PkIuaGFzKGUpLEc9dS5maWx0ZXIoZT0+ZS5zdGFydHNXaXRoKFwiLS1cIikmJmUuaW5jbHVkZXMoXCI9XCIpKS5tYXAoZT0+ZS5zcGxpdChcIj1cIikpLnJlZHVjZSgoZSxbdCxvXSk9PihlW3RdPW8sZSkse30pO3ZhciBVPV8oXCItLWRyeS1ydW5cIiksZz0oKT0+XyhcIi0tdmVyYm9zZVwiKXx8aCgpLlZFUkJPU0U9PT1cInRydWVcIixOPWcoKTt2YXIgbT0oZT1cIlwiLC4uLnQpPT5jb25zb2xlLmxvZyhlLnBhZEVuZCg5KSxcInxcIiwuLi50KTt2YXIgeT0oLi4uZSk9PmNvbnNvbGUuZXJyb3IoXCJcXHV7MUY1MzR9IEVSUk9SXCIucGFkRW5kKDkpLFwifFwiLC4uLmUpLHY9KC4uLmUpPT5tKFwiXFx1ezFGNTM1fSBJTkZPXCIsLi4uZSksZj0oLi4uZSk9Pm0oXCJcXHV7MUY3RTB9IFdBUk5cIiwuLi5lKSxNPTAsaT0oLi4uZSk9PmcoKSYmbShgXFx1ezFGN0UxfSAke00rK31gLC4uLmUpO3ZhciBiPSgpPT57bGV0IGU9Z2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lfHxnbG9iYWxUaGlzLmNocm9tZT8ucnVudGltZSx0PSgpPT5zZXRJbnRlcnZhbChlLmdldFBsYXRmb3JtSW5mbywyNGUzKTtlLm9uU3RhcnR1cC5hZGRMaXN0ZW5lcih0KSx0KCl9O3ZhciBuPXtcImlzQ29udGVudFNjcmlwdFwiOmZhbHNlLFwiaXNCYWNrZ3JvdW5kXCI6dHJ1ZSxcImlzUmVhY3RcIjpmYWxzZSxcInJ1bnRpbWVzXCI6W1wiYmFja2dyb3VuZC1zZXJ2aWNlLXJ1bnRpbWVcIl0sXCJob3N0XCI6XCJsb2NhbGhvc3RcIixcInBvcnRcIjoxODE1LFwiZW50cnlGaWxlUGF0aFwiOlwiL1VzZXJzL3NvbW5hdGhnaG9ycGFkZS9EZXNrdG9wL0Nocm9tZUV4dGVuc2lvbi9leHRlbnNpb24vLnBsYXNtby9zdGF0aWMvYmFja2dyb3VuZC9pbmRleC50c1wiLFwiYnVuZGxlSWRcIjpcImMzMzg5MDhlNzA0YzkxZjFcIixcImVudkhhc2hcIjpcImQ5OWE1ZmZhNTdhY2Q2MzhcIixcInZlcmJvc2VcIjpcImZhbHNlXCIsXCJzZWN1cmVcIjpmYWxzZSxcInNlcnZlclBvcnRcIjo1MTQ2M307bW9kdWxlLmJ1bmRsZS5ITVJfQlVORExFX0lEPW4uYnVuZGxlSWQ7Z2xvYmFsVGhpcy5wcm9jZXNzPXthcmd2OltdLGVudjp7VkVSQk9TRTpuLnZlcmJvc2V9fTt2YXIgRD1tb2R1bGUuYnVuZGxlLk1vZHVsZTtmdW5jdGlvbiBIKGUpe0QuY2FsbCh0aGlzLGUpLHRoaXMuaG90PXtkYXRhOm1vZHVsZS5idW5kbGUuaG90RGF0YVtlXSxfYWNjZXB0Q2FsbGJhY2tzOltdLF9kaXNwb3NlQ2FsbGJhY2tzOltdLGFjY2VwdDpmdW5jdGlvbih0KXt0aGlzLl9hY2NlcHRDYWxsYmFja3MucHVzaCh0fHxmdW5jdGlvbigpe30pfSxkaXNwb3NlOmZ1bmN0aW9uKHQpe3RoaXMuX2Rpc3Bvc2VDYWxsYmFja3MucHVzaCh0KX19LG1vZHVsZS5idW5kbGUuaG90RGF0YVtlXT12b2lkIDB9bW9kdWxlLmJ1bmRsZS5Nb2R1bGU9SDttb2R1bGUuYnVuZGxlLmhvdERhdGE9e307dmFyIGM9Z2xvYmFsVGhpcy5icm93c2VyfHxnbG9iYWxUaGlzLmNocm9tZXx8bnVsbDtmdW5jdGlvbiBSKCl7cmV0dXJuIW4uaG9zdHx8bi5ob3N0PT09XCIwLjAuMC4wXCI/bG9jYXRpb24ucHJvdG9jb2wuaW5kZXhPZihcImh0dHBcIik9PT0wP2xvY2F0aW9uLmhvc3RuYW1lOlwibG9jYWxob3N0XCI6bi5ob3N0fWZ1bmN0aW9uIHgoKXtyZXR1cm4hbi5ob3N0fHxuLmhvc3Q9PT1cIjAuMC4wLjBcIj9cImxvY2FsaG9zdFwiOm4uaG9zdH1mdW5jdGlvbiBkKCl7cmV0dXJuIG4ucG9ydHx8bG9jYXRpb24ucG9ydH12YXIgUD1cIl9fcGxhc21vX3J1bnRpbWVfcGFnZV9cIixTPVwiX19wbGFzbW9fcnVudGltZV9zY3JpcHRfXCI7dmFyIE89YCR7bi5zZWN1cmU/XCJodHRwc1wiOlwiaHR0cFwifTovLyR7UigpfToke2QoKX0vYDthc3luYyBmdW5jdGlvbiBrKGU9MTQ3MCl7Zm9yKDs7KXRyeXthd2FpdCBmZXRjaChPKTticmVha31jYXRjaHthd2FpdCBuZXcgUHJvbWlzZShvPT5zZXRUaW1lb3V0KG8sZSkpfX1pZihjLnJ1bnRpbWUuZ2V0TWFuaWZlc3QoKS5tYW5pZmVzdF92ZXJzaW9uPT09Myl7bGV0IGU9Yy5ydW50aW1lLmdldFVSTChcIi9fX3BsYXNtb19obXJfcHJveHlfXz91cmw9XCIpO2dsb2JhbFRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcImZldGNoXCIsZnVuY3Rpb24odCl7bGV0IG89dC5yZXF1ZXN0LnVybDtpZihvLnN0YXJ0c1dpdGgoZSkpe2xldCBzPW5ldyBVUkwoZGVjb2RlVVJJQ29tcG9uZW50KG8uc2xpY2UoZS5sZW5ndGgpKSk7cy5ob3N0bmFtZT09PW4uaG9zdCYmcy5wb3J0PT09YCR7bi5wb3J0fWA/KHMuc2VhcmNoUGFyYW1zLnNldChcInRcIixEYXRlLm5vdygpLnRvU3RyaW5nKCkpLHQucmVzcG9uZFdpdGgoZmV0Y2gocykudGhlbihyPT5uZXcgUmVzcG9uc2Uoci5ib2R5LHtoZWFkZXJzOntcIkNvbnRlbnQtVHlwZVwiOnIuaGVhZGVycy5nZXQoXCJDb250ZW50LVR5cGVcIik/P1widGV4dC9qYXZhc2NyaXB0XCJ9fSkpKSk6dC5yZXNwb25kV2l0aChuZXcgUmVzcG9uc2UoXCJQbGFzbW8gSE1SXCIse3N0YXR1czoyMDAsc3RhdHVzVGV4dDpcIlRlc3RpbmdcIn0pKX19KX1mdW5jdGlvbiBFKGUsdCl7bGV0e21vZHVsZXM6b309ZTtyZXR1cm4gbz8hIW9bdF06ITF9ZnVuY3Rpb24gQyhlPWQoKSl7bGV0IHQ9eCgpO3JldHVybmAke24uc2VjdXJlfHxsb2NhdGlvbi5wcm90b2NvbD09PVwiaHR0cHM6XCImJiEvbG9jYWxob3N0fDEyNy4wLjAuMXwwLjAuMC4wLy50ZXN0KHQpP1wid3NzXCI6XCJ3c1wifTovLyR7dH06JHtlfS9gfWZ1bmN0aW9uIEwoZSl7dHlwZW9mIGUubWVzc2FnZT09XCJzdHJpbmdcIiYmeShcIltwbGFzbW8vcGFyY2VsLXJ1bnRpbWVdOiBcIitlLm1lc3NhZ2UpfWZ1bmN0aW9uIFQoZSl7aWYodHlwZW9mIGdsb2JhbFRoaXMuV2ViU29ja2V0PlwidVwiKXJldHVybjtsZXQgdD1uZXcgV2ViU29ja2V0KEMoTnVtYmVyKGQoKSkrMSkpO3JldHVybiB0LmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsYXN5bmMgZnVuY3Rpb24obyl7bGV0IHM9SlNPTi5wYXJzZShvLmRhdGEpO2F3YWl0IGUocyl9KSx0LmFkZEV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLEwpLHR9ZnVuY3Rpb24gQShlKXtpZih0eXBlb2YgZ2xvYmFsVGhpcy5XZWJTb2NrZXQ+XCJ1XCIpcmV0dXJuO2xldCB0PW5ldyBXZWJTb2NrZXQoQygpKTtyZXR1cm4gdC5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLGFzeW5jIGZ1bmN0aW9uKG8pe2xldCBzPUpTT04ucGFyc2Uoby5kYXRhKTtpZihzLnR5cGU9PT1cInVwZGF0ZVwiJiZhd2FpdCBlKHMuYXNzZXRzKSxzLnR5cGU9PT1cImVycm9yXCIpZm9yKGxldCByIG9mIHMuZGlhZ25vc3RpY3MuYW5zaSl7bGV0IGw9ci5jb2RlZnJhbWV8fHIuc3RhY2s7ZihcIltwbGFzbW8vcGFyY2VsLXJ1bnRpbWVdOiBcIityLm1lc3NhZ2UrYFxuYCtsK2BcblxuYCtyLmhpbnRzLmpvaW4oYFxuYCkpfX0pLHQuYWRkRXZlbnRMaXN0ZW5lcihcImVycm9yXCIsTCksdC5hZGRFdmVudExpc3RlbmVyKFwib3BlblwiLCgpPT57dihgW3BsYXNtby9wYXJjZWwtcnVudGltZV06IENvbm5lY3RlZCB0byBITVIgc2VydmVyIGZvciAke24uZW50cnlGaWxlUGF0aH1gKX0pLHQuYWRkRXZlbnRMaXN0ZW5lcihcImNsb3NlXCIsKCk9PntmKGBbcGxhc21vL3BhcmNlbC1ydW50aW1lXTogQ29ubmVjdGlvbiB0byB0aGUgSE1SIHNlcnZlciBpcyBjbG9zZWQgZm9yICR7bi5lbnRyeUZpbGVQYXRofWApfSksdH12YXIgdz1tb2R1bGUuYnVuZGxlLnBhcmVudCxhPXtidWlsZFJlYWR5OiExLGJnQ2hhbmdlZDohMSxjc0NoYW5nZWQ6ITEscGFnZUNoYW5nZWQ6ITEsc2NyaXB0UG9ydHM6bmV3IFNldCxwYWdlUG9ydHM6bmV3IFNldH07YXN5bmMgZnVuY3Rpb24gcChlPSExKXtpZihlfHxhLmJ1aWxkUmVhZHkmJmEucGFnZUNoYW5nZWQpe2koXCJCR1NXIFJ1bnRpbWUgLSByZWxvYWRpbmcgUGFnZVwiKTtmb3IobGV0IHQgb2YgYS5wYWdlUG9ydHMpdC5wb3N0TWVzc2FnZShudWxsKX1pZihlfHxhLmJ1aWxkUmVhZHkmJihhLmJnQ2hhbmdlZHx8YS5jc0NoYW5nZWQpKXtpKFwiQkdTVyBSdW50aW1lIC0gcmVsb2FkaW5nIENTXCIpO2xldCB0PWF3YWl0IGM/LnRhYnMucXVlcnkoe2FjdGl2ZTohMH0pO2ZvcihsZXQgbyBvZiBhLnNjcmlwdFBvcnRzKXtsZXQgcz10LnNvbWUocj0+ci5pZD09PW8uc2VuZGVyLnRhYj8uaWQpO28ucG9zdE1lc3NhZ2Uoe19fcGxhc21vX2NzX2FjdGl2ZV90YWJfXzpzfSl9Yy5ydW50aW1lLnJlbG9hZCgpfX1pZighd3x8IXcuaXNQYXJjZWxSZXF1aXJlKXtiKCk7bGV0IGU9QShhc3luYyB0PT57aShcIkJHU1cgUnVudGltZSAtIE9uIEhNUiBVcGRhdGVcIiksYS5iZ0NoYW5nZWR8fD10LmZpbHRlcihzPT5zLmVudkhhc2g9PT1uLmVudkhhc2gpLnNvbWUocz0+RShtb2R1bGUuYnVuZGxlLHMuaWQpKTtsZXQgbz10LmZpbmQocz0+cy50eXBlPT09XCJqc29uXCIpO2lmKG8pe2xldCBzPW5ldyBTZXQodC5tYXAobD0+bC5pZCkpLHI9T2JqZWN0LnZhbHVlcyhvLmRlcHNCeUJ1bmRsZSkubWFwKGw9Pk9iamVjdC52YWx1ZXMobCkpLmZsYXQoKTthLmJnQ2hhbmdlZHx8PXIuZXZlcnkobD0+cy5oYXMobCkpfXAoKX0pO2UuYWRkRXZlbnRMaXN0ZW5lcihcIm9wZW5cIiwoKT0+e2xldCB0PXNldEludGVydmFsKCgpPT5lLnNlbmQoXCJwaW5nXCIpLDI0ZTMpO2UuYWRkRXZlbnRMaXN0ZW5lcihcImNsb3NlXCIsKCk9PmNsZWFySW50ZXJ2YWwodCkpfSksZS5hZGRFdmVudExpc3RlbmVyKFwiY2xvc2VcIixhc3luYygpPT57YXdhaXQgaygpLHAoITApfSl9VChhc3luYyBlPT57c3dpdGNoKGkoXCJCR1NXIFJ1bnRpbWUgLSBPbiBCdWlsZCBSZXBhY2thZ2VkXCIpLGUudHlwZSl7Y2FzZVwiYnVpbGRfcmVhZHlcIjp7YS5idWlsZFJlYWR5fHw9ITAscCgpO2JyZWFrfWNhc2VcImNzX2NoYW5nZWRcIjp7YS5jc0NoYW5nZWR8fD0hMCxwKCk7YnJlYWt9fX0pO2MucnVudGltZS5vbkNvbm5lY3QuYWRkTGlzdGVuZXIoZnVuY3Rpb24oZSl7bGV0IHQ9ZS5uYW1lLnN0YXJ0c1dpdGgoUCksbz1lLm5hbWUuc3RhcnRzV2l0aChTKTtpZih0fHxvKXtsZXQgcz10P2EucGFnZVBvcnRzOmEuc2NyaXB0UG9ydHM7cy5hZGQoZSksZS5vbkRpc2Nvbm5lY3QuYWRkTGlzdGVuZXIoKCk9PntzLmRlbGV0ZShlKX0pLGUub25NZXNzYWdlLmFkZExpc3RlbmVyKGZ1bmN0aW9uKHIpe2koXCJCR1NXIFJ1bnRpbWUgLSBPbiBzb3VyY2UgY2hhbmdlZFwiLHIpLHIuX19wbGFzbW9fY3NfY2hhbmdlZF9fJiYoYS5jc0NoYW5nZWR8fD0hMCksci5fX3BsYXNtb19wYWdlX2NoYW5nZWRfXyYmKGEucGFnZUNoYW5nZWR8fD0hMCkscCgpfSl9fSk7Yy5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihmdW5jdGlvbih0KXtyZXR1cm4gdC5fX3BsYXNtb19mdWxsX3JlbG9hZF9fJiYoaShcIkJHU1cgUnVudGltZSAtIE9uIHRvcC1sZXZlbCBjb2RlIGNoYW5nZWRcIikscCgpKSwhMH0pO1xuIiwiaW1wb3J0IFwiLi9tZXNzYWdpbmdcIlxuaW1wb3J0IFwiLi4vLi4vLi4vYmFja2dyb3VuZC9pbmRleFwiIiwiLy8gQHRzLW5vY2hlY2tcbmdsb2JhbFRoaXMuX19wbGFzbW9JbnRlcm5hbFBvcnRNYXAgPSBuZXcgTWFwKClcblxuaW1wb3J0IHsgZGVmYXVsdCBhcyBtZXNzYWdlc0dldFByZWRpY3Rpb24gfSBmcm9tIFwifmJhY2tncm91bmQvbWVzc2FnZXMvZ2V0X3ByZWRpY3Rpb25cIlxuaW1wb3J0IHsgZGVmYXVsdCBhcyBtZXNzYWdlc09wZW5TaWRlUGFuZWwgfSBmcm9tIFwifmJhY2tncm91bmQvbWVzc2FnZXMvb3Blbl9zaWRlX3BhbmVsXCJcbmltcG9ydCB7IGRlZmF1bHQgYXMgbWVzc2FnZXNTeW5jTGVldGNvZGUgfSBmcm9tIFwifmJhY2tncm91bmQvbWVzc2FnZXMvc3luYy1sZWV0Y29kZVwiXG5cbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZUV4dGVybmFsLmFkZExpc3RlbmVyKChyZXF1ZXN0LCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xuICBzd2l0Y2ggKHJlcXVlc3Q/Lm5hbWUpIHtcbiAgICBcbiAgICBkZWZhdWx0OlxuICAgICAgYnJlYWtcbiAgfVxuXG4gIHJldHVybiB0cnVlXG59KVxuXG5jaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKHJlcXVlc3QsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XG4gIHN3aXRjaCAocmVxdWVzdC5uYW1lKSB7XG4gICAgY2FzZSBcImdldF9wcmVkaWN0aW9uXCI6XG4gIG1lc3NhZ2VzR2V0UHJlZGljdGlvbih7XG4gICAgLi4ucmVxdWVzdCxcbiAgICBzZW5kZXJcbiAgfSwge1xuICAgIHNlbmQ6IChwKSA9PiBzZW5kUmVzcG9uc2UocClcbiAgfSlcbiAgYnJlYWtcbmNhc2UgXCJvcGVuX3NpZGVfcGFuZWxcIjpcbiAgbWVzc2FnZXNPcGVuU2lkZVBhbmVsKHtcbiAgICAuLi5yZXF1ZXN0LFxuICAgIHNlbmRlclxuICB9LCB7XG4gICAgc2VuZDogKHApID0+IHNlbmRSZXNwb25zZShwKVxuICB9KVxuICBicmVha1xuY2FzZSBcInN5bmMtbGVldGNvZGVcIjpcbiAgbWVzc2FnZXNTeW5jTGVldGNvZGUoe1xuICAgIC4uLnJlcXVlc3QsXG4gICAgc2VuZGVyXG4gIH0sIHtcbiAgICBzZW5kOiAocCkgPT4gc2VuZFJlc3BvbnNlKHApXG4gIH0pXG4gIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIGJyZWFrXG4gIH1cblxuICByZXR1cm4gdHJ1ZVxufSlcblxuY2hyb21lLnJ1bnRpbWUub25Db25uZWN0LmFkZExpc3RlbmVyKGZ1bmN0aW9uKHBvcnQpIHtcbiAgZ2xvYmFsVGhpcy5fX3BsYXNtb0ludGVybmFsUG9ydE1hcC5zZXQocG9ydC5uYW1lLCBwb3J0KVxuICBwb3J0Lm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihmdW5jdGlvbihyZXF1ZXN0KSB7XG4gICAgc3dpdGNoIChwb3J0Lm5hbWUpIHtcbiAgICAgIFxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYnJlYWtcbiAgICB9XG4gIH0pXG59KVxuXG4iLCJpbXBvcnQgdHlwZSB7IFBsYXNtb01lc3NhZ2luZyB9IGZyb20gXCJAcGxhc21vaHEvbWVzc2FnaW5nXCJcbmltcG9ydCB7IEJBQ0tFTkRfVVJMIH0gZnJvbSBcIi4uLy4uL2xpYi9jb25zdGFudHNcIlxuXG5jb25zdCBoYW5kbGVyOiBQbGFzbW9NZXNzYWdpbmcuTWVzc2FnZUhhbmRsZXIgPSBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgY29uc3QgeyBzbHVnIH0gPSByZXEuYm9keTtcbiAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7QkFDS0VORF9VUkx9L2FwaS9wcmVkaWN0LyR7c2x1Z31gKTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZFwiKTtcbiAgICAgIHJlcy5zZW5kKGF3YWl0IHJlc3BvbnNlLmpzb24oKSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIFJldHVybiBhIGZhbGxiYWNrIGZvciBkZW1vbnN0cmF0aW9uIHB1cnBvc2VzIGlmIGJhY2tlbmQgaXMgZG93blxuICAgICAgcmVzLnNlbmQoeyBzb2x2ZUNoYW5jZTogNzYsIGV4cGVjdGVkVGltZU1pbnV0ZXM6IDE4LCBjb25maWRlbmNlOiBcIkhJR0hcIiB9KTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBoYW5kbGVyXG4iLCJleHBvcnQgY29uc3QgTEVFVENPREVfR1JBUEhRTF9VUkwgPSAnaHR0cHM6Ly9sZWV0Y29kZS5jb20vZ3JhcGhxbC8nO1xuZXhwb3J0IGNvbnN0IFpFUk9UUkFDX1VSTCA9ICdodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vemVyb3RyYWMvbGVldGNvZGVfcHJvYmxlbV9yYXRpbmcvbWFpbi9kYXRhLmpzb24nO1xuZXhwb3J0IGNvbnN0IEJBQ0tFTkRfVVJMID0gcHJvY2Vzcy5lbnYuUExBU01PX1BVQkxJQ19CQUNLRU5EX1VSTCB8fCAnaHR0cDovL2xvY2FsaG9zdDo4MDgwJztcbiIsImV4cG9ydHMuaW50ZXJvcERlZmF1bHQgPSBmdW5jdGlvbiAoYSkge1xuICByZXR1cm4gYSAmJiBhLl9fZXNNb2R1bGUgPyBhIDoge2RlZmF1bHQ6IGF9O1xufTtcblxuZXhwb3J0cy5kZWZpbmVJbnRlcm9wRmxhZyA9IGZ1bmN0aW9uIChhKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShhLCAnX19lc01vZHVsZScsIHt2YWx1ZTogdHJ1ZX0pO1xufTtcblxuZXhwb3J0cy5leHBvcnRBbGwgPSBmdW5jdGlvbiAoc291cmNlLCBkZXN0KSB7XG4gIE9iamVjdC5rZXlzKHNvdXJjZSkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgaWYgKGtleSA9PT0gJ2RlZmF1bHQnIHx8IGtleSA9PT0gJ19fZXNNb2R1bGUnIHx8IGRlc3QuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShkZXN0LCBrZXksIHtcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZVtrZXldO1xuICAgICAgfSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIGRlc3Q7XG59O1xuXG5leHBvcnRzLmV4cG9ydCA9IGZ1bmN0aW9uIChkZXN0LCBkZXN0TmFtZSwgZ2V0KSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShkZXN0LCBkZXN0TmFtZSwge1xuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgZ2V0OiBnZXQsXG4gIH0pO1xufTtcbiIsImltcG9ydCB0eXBlIHsgUGxhc21vTWVzc2FnaW5nIH0gZnJvbSBcIkBwbGFzbW9ocS9tZXNzYWdpbmdcIlxuXG5jb25zdCBoYW5kbGVyOiBQbGFzbW9NZXNzYWdpbmcuTWVzc2FnZUhhbmRsZXIgPSBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgaWYgKHJlcS5ib2R5Py5hY3Rpb24gPT09IFwib3Blbl9zaWRlX3BhbmVsXCIpIHtcbiAgICBjb25zdCBzZW5kZXJUYWJJZCA9IHJlcS5zZW5kZXI/LnRhYj8uaWQ7XG4gICAgaWYgKHNlbmRlclRhYklkKSB7XG4gICAgICAvLyBPcGVuIHRoZSBzaWRlIHBhbmVsIGZvciB0aGUgY3VycmVudCB0YWJcbiAgICAgIGNocm9tZS5zaWRlUGFuZWwub3Blbih7IHRhYklkOiBzZW5kZXJUYWJJZCB9KTtcbiAgICAgIHJlcy5zZW5kKHsgc3RhdHVzOiBcInN1Y2Nlc3NcIiB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzLnNlbmQoeyBlcnJvcjogXCJObyB0YWIgSURcIiB9KTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgaGFuZGxlclxuIiwiaW1wb3J0IHR5cGUgeyBQbGFzbW9NZXNzYWdpbmcgfSBmcm9tIFwiQHBsYXNtb2hxL21lc3NhZ2luZ1wiXG5pbXBvcnQgeyBcbiAgZmV0Y2hVc2VyUHJvZmlsZSwgXG4gIGZldGNoU29sdmVkUHJvYmxlbXMsIFxuICBmZXRjaEFsbFN1Ym1pc3Npb25zLFxuICBmZXRjaENvbnRlc3RIaXN0b3J5IFxufSBmcm9tIFwiLi4vLi4vbGliL2FwaS9sZWV0Y29kZVwiXG5pbXBvcnQgeyBCQUNLRU5EX1VSTCB9IGZyb20gXCIuLi8uLi9saWIvY29uc3RhbnRzXCJcblxuY29uc3Qgc2V0U3RhdHVzID0gKHN0YXR1czogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcsIGNvdW50OiBudW1iZXIgPSAwLCBzdWJDb3VudDogbnVtYmVyID0gMCkgPT4ge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IHN5bmNTdGF0dXM6IHsgc3RhdHVzLCBtZXNzYWdlLCBjb3VudCwgc3ViQ291bnQgfX0pO1xufTtcblxuY29uc3QgaGFuZGxlcjogUGxhc21vTWVzc2FnaW5nLk1lc3NhZ2VIYW5kbGVyID0gYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gIGNvbnN0IHsgYWN0aW9uLCB1c2VybmFtZSB9ID0gcmVxLmJvZHkgfHwge31cblxuICBpZiAoYWN0aW9uID09PSBcInN5bmNfaGlzdG9yeVwiICYmIHVzZXJuYW1lKSB7XG4gICAgY29uc29sZS5sb2coYFN0YXJ0aW5nIExlZXRDb2RlIGhpc3Rvcnkgc3luYyBmb3IgdXNlcjogJHt1c2VybmFtZX1gKVxuICAgIHNldFN0YXR1cygnUlVOTklORycsICdGZXRjaGluZyBwcm9maWxlLi4uJywgMCwgMCk7XG4gICAgXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHByb2ZpbGVEYXRhID0gYXdhaXQgZmV0Y2hVc2VyUHJvZmlsZSh1c2VybmFtZSk7XG4gICAgICBjb25zdCB0b3RhbFNvbHZlZCA9IHByb2ZpbGVEYXRhLmRhdGE/Lm1hdGNoZWRVc2VyPy5zdWJtaXRTdGF0cz8uYWNTdWJtaXNzaW9uTnVtPy5maW5kKChzOiBhbnkpID0+IHMuZGlmZmljdWx0eSA9PT0gXCJBbGxcIik/LmNvdW50IHx8IDA7XG4gICAgICBcbiAgICAgIGNvbnN0IHNvbHZlZFByb2JsZW1zID0gW107XG4gICAgICBsZXQgcHJvYmxlbVNraXAgPSAwO1xuICAgICAgY29uc3QgcHJvYmxlbUxpbWl0ID0gNTA7XG4gICAgICBcbiAgICAgIHdoaWxlIChwcm9ibGVtU2tpcCA8IHRvdGFsU29sdmVkKSB7XG4gICAgICAgIHNldFN0YXR1cygnUlVOTklORycsIGBGZXRjaGluZyBwcm9ibGVtcyAoJHtwcm9ibGVtU2tpcH0vJHt0b3RhbFNvbHZlZH0pLi4uYCwgc29sdmVkUHJvYmxlbXMubGVuZ3RoLCAwKTtcbiAgICAgICAgY29uc3QgcHJvYmxlbURhdGEgPSBhd2FpdCBmZXRjaFNvbHZlZFByb2JsZW1zKHByb2JsZW1Ta2lwLCBwcm9ibGVtTGltaXQpO1xuICAgICAgICBjb25zdCBxdWVzdGlvbnMgPSBwcm9ibGVtRGF0YS5kYXRhPy5wcm9ibGVtc2V0UXVlc3Rpb25MaXN0Py5xdWVzdGlvbnMgfHwgW107XG4gICAgICAgIHNvbHZlZFByb2JsZW1zLnB1c2goLi4ucXVlc3Rpb25zKTtcbiAgICAgICAgcHJvYmxlbVNraXAgKz0gcHJvYmxlbUxpbWl0O1xuICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgNTAwKSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHN1Ym1pc3Npb25zID0gW107XG4gICAgICBsZXQgc3ViT2Zmc2V0ID0gMDtcbiAgICAgIGNvbnN0IHN1YkxpbWl0ID0gMjA7IFxuICAgICAgbGV0IGhhc05leHQgPSB0cnVlO1xuICAgICAgY29uc3QgTUFYX1NVQk1JU1NJT05TX0ZFVENIID0gMjAwMDsgXG5cbiAgICAgIHdoaWxlIChoYXNOZXh0ICYmIHN1Ym1pc3Npb25zLmxlbmd0aCA8IE1BWF9TVUJNSVNTSU9OU19GRVRDSCkge1xuICAgICAgICBzZXRTdGF0dXMoJ1JVTk5JTkcnLCBgRmV0Y2hpbmcgaGlzdG9yaWNhbCBzdWJtaXNzaW9ucy4uLmAsIHNvbHZlZFByb2JsZW1zLmxlbmd0aCwgc3VibWlzc2lvbnMubGVuZ3RoKTtcbiAgICAgICAgY29uc3Qgc3ViRGF0YSA9IGF3YWl0IGZldGNoQWxsU3VibWlzc2lvbnMoc3ViT2Zmc2V0LCBzdWJMaW1pdCk7XG4gICAgICAgIGNvbnN0IHN1Ykxpc3QgPSBzdWJEYXRhLnN1Ym1pc3Npb25zX2R1bXA7XG4gICAgICAgIGlmIChzdWJMaXN0ICYmIHN1Ykxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgIC8vIE1hcCBSRVNUIHJlc3BvbnNlIGZvcm1hdCB0byBvdXIgZXhwZWN0ZWQgZm9ybWF0XG4gICAgICAgICAgY29uc3QgbWFwcGVkID0gc3ViTGlzdC5tYXAoKHM6IGFueSkgPT4gKHtcbiAgICAgICAgICAgIGlkOiBzLmlkLFxuICAgICAgICAgICAgdGl0bGU6IHMudGl0bGUsXG4gICAgICAgICAgICB0aXRsZVNsdWc6IHMudGl0bGVfc2x1ZyxcbiAgICAgICAgICAgIHN0YXR1c0Rpc3BsYXk6IHMuc3RhdHVzX2Rpc3BsYXksXG4gICAgICAgICAgICBsYW5nOiBzLmxhbmcsXG4gICAgICAgICAgICB0aW1lc3RhbXA6IHMudGltZXN0YW1wLnRvU3RyaW5nKCksXG4gICAgICAgICAgfSkpO1xuICAgICAgICAgIHN1Ym1pc3Npb25zLnB1c2goLi4ubWFwcGVkKTtcbiAgICAgICAgICBoYXNOZXh0ID0gc3ViRGF0YS5oYXNfbmV4dDtcbiAgICAgICAgICBzdWJPZmZzZXQgKz0gc3ViTGltaXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaGFzTmV4dCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCA1MDApKTtcbiAgICAgIH1cblxuICAgICAgc2V0U3RhdHVzKCdSVU5OSU5HJywgJ0ZldGNoaW5nIGNvbnRlc3QgaGlzdG9yeS4uLicsIHNvbHZlZFByb2JsZW1zLmxlbmd0aCwgc3VibWlzc2lvbnMubGVuZ3RoKTtcbiAgICAgIGNvbnN0IGNvbnRlc3REYXRhID0gYXdhaXQgZmV0Y2hDb250ZXN0SGlzdG9yeSh1c2VybmFtZSk7XG4gICAgICBjb25zdCBjb250ZXN0SGlzdG9yeSA9IGNvbnRlc3REYXRhLmRhdGE/LnVzZXJDb250ZXN0UmFua2luZ0hpc3RvcnkgfHwgW107XG4gICAgICBjb25zdCBjb250ZXN0UmFua2luZyA9IGNvbnRlc3REYXRhLmRhdGE/LnVzZXJDb250ZXN0UmFua2luZztcblxuICAgICAgc2V0U3RhdHVzKCdSVU5OSU5HJywgJ1B1c2hpbmcgZGF0YSB0byBBbGdvVmF1bHQgYmFja2VuZC4uLicsIHNvbHZlZFByb2JsZW1zLmxlbmd0aCwgc3VibWlzc2lvbnMubGVuZ3RoKTtcbiAgICAgIGNvbnN0IHBheWxvYWQgPSB7XG4gICAgICAgIHVzZXJuYW1lOiB1c2VybmFtZSxcbiAgICAgICAgcHJvZmlsZTogcHJvZmlsZURhdGEuZGF0YT8ubWF0Y2hlZFVzZXI/LnByb2ZpbGUsXG4gICAgICAgIHNvbHZlZFByb2JsZW1zOiBzb2x2ZWRQcm9ibGVtcyxcbiAgICAgICAgc3VibWlzc2lvbnM6IHN1Ym1pc3Npb25zLFxuICAgICAgICBjb250ZXN0UmFua2luZzogY29udGVzdFJhbmtpbmcsXG4gICAgICAgIGNvbnRlc3RIaXN0b3J5OiBjb250ZXN0SGlzdG9yeVxuICAgICAgfTtcblxuICAgICAgY29uc3QgYmFja2VuZFJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7QkFDS0VORF9VUkx9L2FwaS9zeW5jL2xlZXRjb2RlYCwge1xuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHBheWxvYWQpXG4gICAgICB9KTtcblxuICAgICAgaWYgKCFiYWNrZW5kUmVzcG9uc2Uub2spIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBCYWNrZW5kIHJlamVjdGVkIHN5bmMgcGF5bG9hZDogJHtiYWNrZW5kUmVzcG9uc2Uuc3RhdHVzfWApO1xuICAgICAgfVxuXG4gICAgICBzZXRTdGF0dXMoJ1NVQ0NFU1MnLCAnRGF0YSBzeW5jZWQgc3VjY2Vzc2Z1bGx5IScsIHNvbHZlZFByb2JsZW1zLmxlbmd0aCwgc3VibWlzc2lvbnMubGVuZ3RoKTtcbiAgICAgIHJlcy5zZW5kKHsgc3RhdHVzOiBcInN1Y2Nlc3NcIiwgY291bnQ6IHNvbHZlZFByb2JsZW1zLmxlbmd0aCwgc3ViQ291bnQ6IHN1Ym1pc3Npb25zLmxlbmd0aCB9KTtcblxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiU3luYyBmYWlsZWQ6XCIsIGVycm9yKTtcbiAgICAgIHNldFN0YXR1cygnRVJST1InLCBgU3luYyBmYWlsZWQ6ICR7ZXJyb3IudG9TdHJpbmcoKX1gKTtcbiAgICAgIHJlcy5zZW5kKHsgc3RhdHVzOiBcImVycm9yXCIsIG1lc3NhZ2U6IGVycm9yLnRvU3RyaW5nKCkgfSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJlcy5zZW5kKHsgZXJyb3I6IFwiVW5rbm93biBhY3Rpb24gb3IgbWlzc2luZyB1c2VybmFtZVwiIH0pO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGhhbmRsZXJcbiIsImltcG9ydCB7IExFRVRDT0RFX0dSQVBIUUxfVVJMIH0gZnJvbSBcIi4uL2NvbnN0YW50c1wiXG5cbmV4cG9ydCBjb25zdCBmZXRjaEdyYXBoUUwgPSBhc3luYyAocXVlcnk6IHN0cmluZywgdmFyaWFibGVzOiBhbnkgPSB7fSkgPT4ge1xuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKExFRVRDT0RFX0dSQVBIUUxfVVJMLCB7XG4gICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgaGVhZGVyczoge1xuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICdPcmlnaW4nOiAnaHR0cHM6Ly9sZWV0Y29kZS5jb20nLFxuICAgICAgJ1JlZmVyZXInOiAnaHR0cHM6Ly9sZWV0Y29kZS5jb20vJyxcbiAgICB9LFxuICAgIGNyZWRlbnRpYWxzOiAnaW5jbHVkZScsXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBxdWVyeSwgdmFyaWFibGVzIH0pLFxuICB9KTtcbiAgXG4gIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYExlZXRDb2RlIEFQSSBlcnJvcjogJHtyZXNwb25zZS5zdGF0dXN9ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gKTtcbiAgfVxuICBcbiAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcbn07XG5cbmV4cG9ydCBjb25zdCBmZXRjaFVzZXJQcm9maWxlID0gYXN5bmMgKHVzZXJuYW1lOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgcXVlcnkgPSBgXG4gICAgcXVlcnkgdXNlclB1YmxpY1Byb2ZpbGUoJHVzZXJuYW1lOiBTdHJpbmchKSB7XG4gICAgICBtYXRjaGVkVXNlcih1c2VybmFtZTogJHVzZXJuYW1lKSB7XG4gICAgICAgIHVzZXJuYW1lXG4gICAgICAgIHByb2ZpbGUge1xuICAgICAgICAgIHJlYWxOYW1lXG4gICAgICAgICAgdXNlckF2YXRhclxuICAgICAgICAgIHJhbmtpbmdcbiAgICAgICAgfVxuICAgICAgICBzdWJtaXRTdGF0cyB7XG4gICAgICAgICAgYWNTdWJtaXNzaW9uTnVtIHtcbiAgICAgICAgICAgIGRpZmZpY3VsdHlcbiAgICAgICAgICAgIGNvdW50XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICBgO1xuICByZXR1cm4gZmV0Y2hHcmFwaFFMKHF1ZXJ5LCB7IHVzZXJuYW1lIH0pO1xufTtcblxuZXhwb3J0IGNvbnN0IGZldGNoU29sdmVkUHJvYmxlbXMgPSBhc3luYyAoc2tpcDogbnVtYmVyLCBsaW1pdDogbnVtYmVyKSA9PiB7XG4gIGNvbnN0IHF1ZXJ5ID0gYFxuICAgIHF1ZXJ5IHByb2JsZW1zZXRRdWVzdGlvbkxpc3QoJGNhdGVnb3J5U2x1ZzogU3RyaW5nLCAkbGltaXQ6IEludCwgJHNraXA6IEludCwgJGZpbHRlcnM6IFF1ZXN0aW9uTGlzdEZpbHRlcklucHV0KSB7XG4gICAgICBwcm9ibGVtc2V0UXVlc3Rpb25MaXN0OiBxdWVzdGlvbkxpc3QoXG4gICAgICAgIGNhdGVnb3J5U2x1ZzogJGNhdGVnb3J5U2x1Z1xuICAgICAgICBsaW1pdDogJGxpbWl0XG4gICAgICAgIHNraXA6ICRza2lwXG4gICAgICAgIGZpbHRlcnM6ICRmaWx0ZXJzXG4gICAgICApIHtcbiAgICAgICAgdG90YWxOdW1cbiAgICAgICAgcXVlc3Rpb25zOiBkYXRhIHtcbiAgICAgICAgICBmcm9udGVuZFF1ZXN0aW9uSWQ6IHF1ZXN0aW9uRnJvbnRlbmRJZFxuICAgICAgICAgIHRpdGxlXG4gICAgICAgICAgdGl0bGVTbHVnXG4gICAgICAgICAgZGlmZmljdWx0eVxuICAgICAgICAgIHRvcGljVGFncyB7XG4gICAgICAgICAgICBuYW1lXG4gICAgICAgICAgICBpZFxuICAgICAgICAgICAgc2x1Z1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgYDtcbiAgcmV0dXJuIGZldGNoR3JhcGhRTChxdWVyeSwgeyBjYXRlZ29yeVNsdWc6IFwiXCIsIHNraXAsIGxpbWl0LCBmaWx0ZXJzOiB7IHN0YXR1czogXCJBQ1wiIH0gfSk7XG59O1xuXG5leHBvcnQgY29uc3QgZmV0Y2hBbGxTdWJtaXNzaW9ucyA9IGFzeW5jIChvZmZzZXQ6IG51bWJlciwgbGltaXQ6IG51bWJlcikgPT4ge1xuICBjb25zdCB1cmwgPSBgaHR0cHM6Ly9sZWV0Y29kZS5jb20vYXBpL3N1Ym1pc3Npb25zLz9vZmZzZXQ9JHtvZmZzZXR9JmxpbWl0PSR7bGltaXR9YDtcbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICBtZXRob2Q6ICdHRVQnLFxuICAgIGNyZWRlbnRpYWxzOiAnaW5jbHVkZScsXG4gIH0pO1xuICBcbiAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTGVldENvZGUgQVBJIGVycm9yOiAke3Jlc3BvbnNlLnN0YXR1c30gJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICB9XG4gIFxuICByZXR1cm4gcmVzcG9uc2UuanNvbigpO1xufTtcblxuZXhwb3J0IGNvbnN0IGZldGNoQ29udGVzdEhpc3RvcnkgPSBhc3luYyAodXNlcm5hbWU6IHN0cmluZykgPT4ge1xuICBjb25zdCBxdWVyeSA9IGBcbiAgICBxdWVyeSB1c2VyQ29udGVzdFJhbmtpbmdJbmZvKCR1c2VybmFtZTogU3RyaW5nISkge1xuICAgICAgdXNlckNvbnRlc3RSYW5raW5nKHVzZXJuYW1lOiAkdXNlcm5hbWUpIHtcbiAgICAgICAgYXR0ZW5kZWRDb250ZXN0c0NvdW50XG4gICAgICAgIHJhdGluZ1xuICAgICAgICBnbG9iYWxSYW5raW5nXG4gICAgICAgIHRvcFBlcmNlbnRhZ2VcbiAgICAgIH1cbiAgICAgIHVzZXJDb250ZXN0UmFua2luZ0hpc3RvcnkodXNlcm5hbWU6ICR1c2VybmFtZSkge1xuICAgICAgICBhdHRlbmRlZFxuICAgICAgICByYXRpbmdcbiAgICAgICAgcmFua2luZ1xuICAgICAgICBjb250ZXN0IHtcbiAgICAgICAgICB0aXRsZVxuICAgICAgICAgIHN0YXJ0VGltZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICBgO1xuICByZXR1cm4gZmV0Y2hHcmFwaFFMKHF1ZXJ5LCB7IHVzZXJuYW1lIH0pO1xufTtcbiIsImltcG9ydCB7IGZldGNoVXNlclByb2ZpbGUsIGZldGNoU29sdmVkUHJvYmxlbXMsIGZldGNoQWxsU3VibWlzc2lvbnMsIGZldGNoQ29udGVzdEhpc3RvcnkgfSBmcm9tIFwiLi4vbGliL2FwaS9sZWV0Y29kZVwiXG5cbmV4cG9ydCB7fVxuXG5jaHJvbWUuc2lkZVBhbmVsLnNldFBhbmVsQmVoYXZpb3IoeyBvcGVuUGFuZWxPbkFjdGlvbkNsaWNrOiB0cnVlIH0pLmNhdGNoKChlcnJvcikgPT4gY29uc29sZS5lcnJvcihlcnJvcikpO1xuXG5jaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKG1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XG4gIGlmIChtZXNzYWdlLmFjdGlvbiA9PT0gXCJvcGVuX3NpZGVfcGFuZWxcIiAmJiBzZW5kZXIudGFiKSB7XG4gICAgY2hyb21lLnNpZGVQYW5lbC5vcGVuKHsgd2luZG93SWQ6IHNlbmRlci50YWIud2luZG93SWQgfSk7XG4gIH1cblxuICBpZiAobWVzc2FnZS5hY3Rpb24gPT09IFwiZ2V0X3ByZWRpY3Rpb25cIikge1xuICAgIC8vIDFMIGlzIHRlbXBvcmFyeSBmb3IgdGVzdGluZyB3aXRob3V0IGF1dGhcbiAgICBmZXRjaChgaHR0cDovL2xvY2FsaG9zdDo4MDgwL2FwaS9wcmVkaWN0aW9ucy8ke21lc3NhZ2Uuc2x1Z30/dXNlcklkPTFgKVxuICAgICAgLnRoZW4ocmVzID0+IHtcbiAgICAgICAgICBpZiAoIXJlcy5vaykgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIGZldGNoIHByZWRpY3Rpb25cIik7XG4gICAgICAgICAgcmV0dXJuIHJlcy5qc29uKCk7XG4gICAgICB9KVxuICAgICAgLnRoZW4oZGF0YSA9PiBzZW5kUmVzcG9uc2UoZGF0YSkpXG4gICAgICAuY2F0Y2goZXJyID0+IHNlbmRSZXNwb25zZSh7IGVycm9yOiBlcnIubWVzc2FnZSB9KSk7XG4gICAgcmV0dXJuIHRydWU7IC8vIEtlZXAgY2hhbm5lbCBvcGVuXG4gIH1cblxuICBpZiAobWVzc2FnZS5hY3Rpb24gPT09IFwic3luY19oaXN0b3J5XCIpIHtcbiAgICBydW5TeW5jKG1lc3NhZ2UudXNlcm5hbWUpLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UuYWN0aW9uID09PSBcImdldF96ZXJvdHJhY1wiKSB7XG4gICAgZmV0Y2goXCJodHRwczovL3plcm90cmFjLmdpdGh1Yi5pby9sZWV0Y29kZV9wcm9ibGVtX3JhdGluZy9kYXRhLmpzb25cIilcbiAgICAgIC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxuICAgICAgLnRoZW4oZGF0YSA9PiBzZW5kUmVzcG9uc2UoZGF0YSkpXG4gICAgICAuY2F0Y2goZXJyID0+IHNlbmRSZXNwb25zZSh7IGVycm9yOiBlcnIubWVzc2FnZSB9KSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn0pO1xuXG5hc3luYyBmdW5jdGlvbiBydW5TeW5jKHVzZXJuYW1lOiBzdHJpbmcpIHtcbiAgICBjb25zdCB1cGRhdGVTdGF0dXMgPSAoc3RhdHVzOiBzdHJpbmcsIG1zZzogc3RyaW5nLCBjb3VudCA9IDAsIHN1YkNvdW50ID0gMCkgPT4ge1xuICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBzeW5jU3RhdHVzOiB7IHN0YXR1cywgbWVzc2FnZTogbXNnLCBjb3VudCwgc3ViQ291bnQgfSB9KTtcbiAgICB9O1xuXG4gICAgdHJ5IHtcbiAgICAgICAgdXBkYXRlU3RhdHVzKFwiUlVOTklOR1wiLCBcIkZldGNoaW5nIHVzZXIgcHJvZmlsZS4uLlwiKTtcbiAgICAgICAgY29uc3QgcHJvZmlsZVJlcyA9IGF3YWl0IGZldGNoVXNlclByb2ZpbGUodXNlcm5hbWUpO1xuICAgICAgICBpZiAoIXByb2ZpbGVSZXMuZGF0YT8ubWF0Y2hlZFVzZXIpIHRocm93IG5ldyBFcnJvcihcIlVzZXIgbm90IGZvdW5kIG9uIExlZXRDb2RlXCIpO1xuICAgICAgICBjb25zdCBwcm9maWxlID0gcHJvZmlsZVJlcy5kYXRhLm1hdGNoZWRVc2VyO1xuXG4gICAgICAgIHVwZGF0ZVN0YXR1cyhcIlJVTk5JTkdcIiwgXCJGZXRjaGluZyBzb2x2ZWQgcHJvYmxlbXMuLi5cIiwgMCwgMCk7XG4gICAgICAgIC8vIExlZXRDb2RlJ3MgQVBJIHJldHVybnMgYWxsIHNvbHZlZCBwcm9ibGVtcyBpZiBsaW1pdCBpcyBsYXJnZSBlbm91Z2hcbiAgICAgICAgY29uc3QgcHJvYmxlbXNSZXMgPSBhd2FpdCBmZXRjaFNvbHZlZFByb2JsZW1zKDAsIDUwMDApO1xuICAgICAgICBjb25zdCBwcm9ibGVtcyA9IHByb2JsZW1zUmVzLmRhdGE/LnByb2JsZW1zZXRRdWVzdGlvbkxpc3Q/LnF1ZXN0aW9ucyB8fCBbXTtcblxuICAgICAgICB1cGRhdGVTdGF0dXMoXCJSVU5OSU5HXCIsIFwiRmV0Y2hpbmcgc3VibWlzc2lvbnMuLi5cIiwgcHJvYmxlbXMubGVuZ3RoLCAwKTtcbiAgICAgICAgY29uc3Qgc3Vic1JlcyA9IGF3YWl0IGZldGNoQWxsU3VibWlzc2lvbnMoMCwgMjAwMCk7XG4gICAgICAgIGNvbnN0IHJhd1N1YnMgPSBzdWJzUmVzLnN1Ym1pc3Npb25zX2R1bXAgfHwgW107XG4gICAgICAgIGNvbnN0IHN1Ym1pc3Npb25zID0gcmF3U3Vicy5tYXAoKHM6IGFueSkgPT4gKHtcbiAgICAgICAgICAgIGlkOiBzLmlkLFxuICAgICAgICAgICAgdGl0bGU6IHMudGl0bGUsXG4gICAgICAgICAgICB0aXRsZVNsdWc6IHMudGl0bGVfc2x1ZyxcbiAgICAgICAgICAgIHN0YXR1c0Rpc3BsYXk6IHMuc3RhdHVzX2Rpc3BsYXksXG4gICAgICAgICAgICBsYW5nOiBzLmxhbmcsXG4gICAgICAgICAgICB0aW1lc3RhbXA6IHMudGltZXN0YW1wLnRvU3RyaW5nKCksXG4gICAgICAgIH0pKTtcblxuICAgICAgICB1cGRhdGVTdGF0dXMoXCJSVU5OSU5HXCIsIFwiRmV0Y2hpbmcgY29udGVzdCBoaXN0b3J5Li4uXCIsIHByb2JsZW1zLmxlbmd0aCwgc3VibWlzc2lvbnMubGVuZ3RoKTtcbiAgICAgICAgY29uc3QgY29udGVzdFJlcyA9IGF3YWl0IGZldGNoQ29udGVzdEhpc3RvcnkodXNlcm5hbWUpO1xuICAgICAgICBjb25zdCBjb250ZXN0SGlzdG9yeSA9IGNvbnRlc3RSZXMuZGF0YT8udXNlckNvbnRlc3RSYW5raW5nSGlzdG9yeSB8fCBbXTtcbiAgICAgICAgY29uc3QgY29udGVzdFJhbmtpbmcgPSBjb250ZXN0UmVzLmRhdGE/LnVzZXJDb250ZXN0UmFua2luZyB8fCBudWxsO1xuXG4gICAgICAgIHVwZGF0ZVN0YXR1cyhcIlJVTk5JTkdcIiwgXCJQdXNoaW5nIHRvIEFsZ29WYXVsdCBiYWNrZW5kLi4uXCIsIHByb2JsZW1zLmxlbmd0aCwgc3VibWlzc2lvbnMubGVuZ3RoKTtcblxuICAgICAgICBjb25zdCBwYXlsb2FkID0ge1xuICAgICAgICAgICAgdXNlcm5hbWU6IHVzZXJuYW1lLFxuICAgICAgICAgICAgcHJvZmlsZTogcHJvZmlsZS5wcm9maWxlLFxuICAgICAgICAgICAgc29sdmVkUHJvYmxlbXM6IHByb2JsZW1zLFxuICAgICAgICAgICAgc3VibWlzc2lvbnM6IHN1Ym1pc3Npb25zLFxuICAgICAgICAgICAgY29udGVzdEhpc3Rvcnk6IGNvbnRlc3RIaXN0b3J5LFxuICAgICAgICAgICAgY29udGVzdFJhbmtpbmc6IGNvbnRlc3RSYW5raW5nXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChcImh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9hcGkvc3luYy9sZWV0Y29kZVwiLCB7XG4gICAgICAgICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocGF5bG9hZClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICAgICAgY29uc3QgZXJyQm9keSA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQmFja2VuZCBzeW5jIGZhaWxlZDogJHtlcnJCb2R5fWApO1xuICAgICAgICB9XG5cbiAgICAgICAgdXBkYXRlU3RhdHVzKFwiU1VDQ0VTU1wiLCBcIlN5bmMgY29tcGxldGVkIHN1Y2Nlc3NmdWxseSFcIiwgcHJvYmxlbXMubGVuZ3RoLCBzdWJtaXNzaW9ucy5sZW5ndGgpO1xuICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiU3luYyBFcnJvcjpcIiwgZSk7XG4gICAgICAgIHVwZGF0ZVN0YXR1cyhcIkVSUk9SXCIsIGUubWVzc2FnZSB8fCBcIkFuIHVua25vd24gZXJyb3Igb2NjdXJyZWQgZHVyaW5nIHN5bmNcIik7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbXSwidmVyc2lvbiI6MywiZmlsZSI6ImluZGV4LmpzLm1hcCJ9
 globalThis.define=__define;  })(globalThis.define);