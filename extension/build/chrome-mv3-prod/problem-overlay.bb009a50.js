var e,t;"function"==typeof(e=globalThis.define)&&(t=e,e=null),function(t,n,o,a,i){var r="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{},l="function"==typeof r[a]&&r[a],s=l.cache||{},d="undefined"!=typeof module&&"function"==typeof module.require&&module.require.bind(module);function c(e,n){if(!s[e]){if(!t[e]){var o="function"==typeof r[a]&&r[a];if(!n&&o)return o(e,!0);if(l)return l(e,!0);if(d&&"string"==typeof e)return d(e);var i=Error("Cannot find module '"+e+"'");throw i.code="MODULE_NOT_FOUND",i}u.resolve=function(n){var o=t[e][1][n];return null!=o?o:n},u.cache={};var p=s[e]=new c.Module(e);t[e][0].call(p.exports,u,p,p.exports,this)}return s[e].exports;function u(e){var t=u.resolve(e);return!1===t?{}:c(t)}}c.isParcelRequire=!0,c.Module=function(e){this.id=e,this.bundle=c,this.exports={}},c.modules=t,c.cache=s,c.parent=l,c.register=function(e,n){t[e]=[function(e,t){t.exports=n},{}]},Object.defineProperty(c,"root",{get:function(){return r[a]}}),r[a]=c;for(var p=0;p<n.length;p++)c(n[p]);if(o){var u=c(o);"object"==typeof exports&&"undefined"!=typeof module?module.exports=u:"function"==typeof e&&e.amd?e(function(){return u}):i&&(this[i]=u)}}({"2ZIMm":[function(e,t,n){var o=e("@parcel/transformer-js/src/esmodule-helpers.js");o.defineInteropFlag(n),o.export(n,"config",()=>r);var a=e("../lib/leetcode-url"),i=e("./ZenithSystemOverlay");let r={matches:["https://leetcode.com/problems/*","https://leetcode.com/contest/*/problems/*"],run_at:"document_idle"},l=!1,s=!1,d=e=>{if(!l||s)return;let t=e.target,n=t?.closest('a, button, [role="tab"]');if(!n||"av-zenith-unlock-btn"===n.id||n.closest("#av-zenith-unlock-btn")||"av-zenith-pane-unlock-btn"===n.id)return;let o=(n.getAttribute("href")||"")+(n.querySelector("a")?.getAttribute("href")||""),a=n.textContent?.trim()||"",r=n.getAttribute("data-layout-path")||"",d=n.getAttribute("aria-label")||n.getAttribute("title")||"",c=/\/(editorial|solutions|discuss)/i.test(o)||/^(Editorial|Solutions?|Discussions?|Discuss)/i.test(a)||/editorial|solution|discuss/i.test(r)||/editorial|solution|discuss/i.test(d);c&&!/Description|Submissions?/i.test(a)&&(e.preventDefault(),e.stopPropagation(),(0,i.showZenithToast)("Solutions locked in Zenith Mode. Click 'Unlock Solutions' if stuck."))},c=()=>{if(!l)return;if(s){document.querySelectorAll('[data-algovault-zenith-tab="forbidden"]').forEach(e=>{e.removeAttribute("data-algovault-zenith-tab"),e.style.removeProperty("display")}),document.querySelectorAll('[data-algovault-zenith-hide="true"]').forEach(e=>{e.removeAttribute("data-algovault-zenith-hide"),e.style.removeProperty("display")});let e=document.getElementById("av-zenith-pane-blocker");e&&e.remove();return}let e=window.location.pathname.toLowerCase(),t=e.includes("/editorial")||e.includes("/solutions")||e.includes("/discuss");if(t){let e=Array.from(document.querySelectorAll('[role="tab"], [role="tablist"] a, [role="tablist"] button, a, button')).find(e=>{let t=e.textContent?.trim()||"",n=e.getAttribute("href")||"",o=e.getAttribute("data-layout-path")||"";return/Description/i.test(t)||/\/description/i.test(n)||/description/i.test(o)});e&&e.click();let t=window.location.href.replace(/\/(editorial|solutions|discuss)[^?]*/i,"/");t!==window.location.href&&window.history.replaceState(null,"",t)}let n=document.querySelectorAll('[role="tablist"] > *, [role="tab"], [role="tablist"] a, [role="tablist"] button, div[class*="tab-"] > *');n.forEach(e=>{if("av-zenith-unlock-btn"===e.id||e.closest("#av-zenith-unlock-btn"))return;let t=e.textContent?.trim()||"",n=(e.getAttribute("href")||"")+(e.querySelector("a")?.getAttribute("href")||""),o=(e.getAttribute("aria-label")||"")+(e.getAttribute("title")||""),a=e.getAttribute("data-layout-path")||"",i=/Description/i.test(t)||/\/description/i.test(n)||/description/i.test(a),r=/Submissions?/i.test(t)||/\/submissions/i.test(n)||/submissions/i.test(a);if(i||r)return;let l=/^(Editorial|Solutions?|Discussions?|Discuss)/i.test(t)||/\/(editorial|solutions|discuss)/i.test(n)||/editorial|solution|discuss/i.test(o)||/editorial|solution|discuss/i.test(a);l&&(e.setAttribute("data-algovault-zenith-tab","forbidden"),e.style.setProperty("display","none","important"))});let o=document.querySelectorAll('a[href*="/tag/"], a[href^="/tag/"]');o.forEach(e=>{e.setAttribute("data-algovault-zenith-hide","true");let t=e.closest('div.flex, div.flex-wrap, div[class*="tag"]')||e.parentElement;t&&!t.querySelector('[role="tablist"]')&&(t.setAttribute("data-algovault-zenith-hide","true"),t.style.setProperty("display","none","important"))}),document.querySelectorAll('button, div[role="button"], a').forEach(e=>{let t=e.textContent?.trim()||"";("Topics"===t||t.startsWith("Topics"))&&(e.setAttribute("data-algovault-zenith-hide","true"),e.style.setProperty("display","none","important"))}),document.querySelectorAll('button, div[role="button"], a').forEach(e=>{if("av-zenith-unlock-btn"===e.id||"av-start-zenith-btn"===e.id)return;let t=e.textContent?.trim()||"";("Companies"===t||t.startsWith("Companies")||e.getAttribute("href")?.includes("/company/"))&&(e.setAttribute("data-algovault-zenith-hide","true"),e.style.setProperty("display","none","important"))});let a=document.getElementById("av-company-trigger-btn");a&&a.style.setProperty("display","none","important"),document.querySelectorAll("div, button, details, span").forEach(e=>{let t=e.textContent?.trim()||"";if(/^Hint\s*\d+/i.test(t)){let t=e.closest('details, div[class*="group"], div[class*="accordion"], div[class*="flex-col"]')||e;t.setAttribute("data-algovault-zenith-hide","true"),t.style.setProperty("display","none","important")}}),document.querySelectorAll("div, section, span, h2, h3").forEach(e=>{let t=e.textContent?.trim()||"";if("Similar Questions"===t||t.startsWith("Similar Questions")){let t=e.closest('div.flex-col, div[class*="group"], section')||e.parentElement;t&&(t.setAttribute("data-algovault-zenith-hide","true"),t.style.setProperty("display","none","important"))}});let i=document.querySelector('[data-track-load="editorial_content"], [data-track-load="solution_detail"], [data-track-load="solutions_list"], div[data-layout-path*="editorial"], div[class*="editorial__"]');if(i&&!s){let e=document.getElementById("av-zenith-pane-blocker");e||((e=document.createElement("div")).id="av-zenith-pane-blocker",e.className="av-zenith-pane-blocker",e.innerHTML=`
        <div style="font-size: 32px; margin-bottom: 12px;">\ud83d\ufe0f</div>
        <div style="font-size: 16px; font-weight: 700; color: #f4f4f5; margin-bottom: 6px;">Solutions Locked in Zenith Mode</div>
        <div style="font-size: 12px; color: #a1a1aa; max-width: 340px; line-height: 1.5; margin-bottom: 20px;">
          Editorial and community solutions are locked to encourage independent problem solving.
        </div>
        <button id="av-zenith-pane-unlock-btn" style="background: rgba(255, 161, 22, 0.15); border: 1px solid rgba(255, 161, 22, 0.4); color: #ffa116; border-radius: 8px; font-weight: 600; font-size: 12px; padding: 9px 18px; cursor: pointer; transition: all 0.15s ease;">
          \ud83d Unlock Solutions
        </button>
      `,e.querySelector("#av-zenith-pane-unlock-btn")?.addEventListener("click",()=>{p()}),i.style.position="relative",i.appendChild(e))}u()},p=()=>{(0,i.showZenithUnlockConfirmModal)(()=>{s=!0,chrome.storage.local.set({"algovault.zenithRevealed":!0,"algovault.zenithReason":"Solutions Unlocked"},()=>{c();let e=document.getElementById("av-zenith-unlock-btn");e&&(e.innerHTML="<span>\u2713</span> Solutions Unlocked",e.disabled=!0,e.style.opacity="0.6",e.style.cursor="default"),(0,i.showZenithToast)("Solutions unlocked for this session")})},()=>{})},u=()=>{if(!l)return;let e=document.querySelector('[role="tablist"]');if(!e)return;let t=document.getElementById("av-zenith-unlock-btn");t||((t=document.createElement("button")).id="av-zenith-unlock-btn",t.className="ml-auto text-xs px-2.5 py-1 rounded transition-all font-medium flex items-center gap-1.5 font-sans select-none",Object.assign(t.style,{marginLeft:"auto",display:"inline-flex",alignItems:"center",gap:"5px",fontSize:"11px",fontWeight:"600",padding:"3px 10px",borderRadius:"6px",backgroundColor:s?"rgba(255, 255, 255, 0.05)":"rgba(255, 161, 22, 0.12)",color:s?"#a1a1aa":"#ffa116",border:s?"1px solid rgba(255, 255, 255, 0.1)":"1px solid rgba(255, 161, 22, 0.35)",cursor:s?"default":"pointer"}),s?(t.innerHTML="<span>\u2713</span> Solutions Unlocked",t.disabled=!0,t.style.opacity="0.6"):(t.innerHTML="<span>\uD83D\uDD13</span> Unlock Solutions",t.title="Click to reveal editorial, hints, and discussion",t.onclick=e=>{e.preventDefault(),e.stopPropagation(),p()}),e.appendChild(t))},m=e=>{let t=document.getElementById("av-zenith-style");if(e)t||((t=document.createElement("style")).id="av-zenith-style",t.textContent=`
        /* Hide Navbar to prevent navigation away and maximize editor space */
        #navbar-root, nav, header:not([role="tablist"]) { display: none !important; }
        
        /* Hide forbidden tabs cleanly in all tablists */
        [data-algovault-zenith-tab="forbidden"],
        [role="tablist"] a[href*="/editorial"],
        [role="tablist"] a[href*="/solutions"],
        [role="tablist"] a[href*="/discuss"],
        [role="tablist"] button[id*="editorial" i],
        [role="tablist"] button[id*="solution" i],
        [role="tablist"] button[id*="discuss" i],
        [role="tablist"] [aria-label*="Editorial" i],
        [role="tablist"] [aria-label*="Solution" i],
        [role="tablist"] [aria-label*="Discuss" i],
        [role="tablist"] [title*="Editorial" i],
        [role="tablist"] [title*="Solution" i],
        [role="tablist"] [title*="Discuss" i],
        [role="tablist"] [data-layout-path*="editorial"],
        [role="tablist"] [data-layout-path*="solution"],
        [role="tablist"] [data-layout-path*="discuss"],
        [role="tablist"] [data-track-load*="editorial"],
        [role="tablist"] [data-track-load*="solution"] {
          display: none !important;
        }
        
        /* Hide topics, companies, hints, similar questions */
        [data-algovault-zenith-hide="true"],
        a[href^="/tag/"], a[href*="/tag/"],
        a[href^="/company/"], a[href*="/company/"] {
          display: none !important;
        }
        
        /* Hide practice estimates during Zenith to prevent difficulty bias */
        #av-solve-chance-bubble, #av-confidence-bubble { display: none !important; }

        /* Hide LeetCode's own timer if present to prevent timer confusion */
        [data-track-load="timer"], div[class*="time__"], div[class*="Timer__"] { display: none !important; }
        
        /* Clean Dark Background & forced dark scheme */
        html, body {
          background-color: #0c0c0e !important;
          color-scheme: dark !important;
        }

        /* Editorial & Solutions Content Blocker Overlay */
        .av-zenith-pane-blocker {
          position: absolute;
          inset: 0;
          background: #121214 !important;
          z-index: 99999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
          text-align: center;
        }
      `,document.head.appendChild(t)),document.addEventListener("click",d,!0),c();else{s=!1,document.removeEventListener("click",d,!0),t&&t.remove();let e=document.getElementById("av-zenith-unlock-btn");e&&e.remove();let n=document.getElementById("av-zenith-pane-blocker");n&&n.remove(),document.querySelectorAll('[data-algovault-zenith-tab="forbidden"]').forEach(e=>{e.removeAttribute("data-algovault-zenith-tab"),e.style.removeProperty("display")}),document.querySelectorAll('[data-algovault-zenith-hide="true"]').forEach(e=>{e.removeAttribute("data-algovault-zenith-hide"),e.style.removeProperty("display")});let o=document.getElementById("av-company-trigger-btn");o&&o.style.removeProperty("display"),setTimeout(()=>{S()},100)}};chrome.storage.local.get(["algovault.isZenith","algovault.zenithRevealed","algovault.zenithSlug"],e=>{let t=(0,a.getLeetCodeProblemSlug)(),n=e["algovault.zenithSlug"];l=!!e["algovault.isZenith"]&&(!n||!t||n===t),s=!!e["algovault.zenithRevealed"],m(l)}),chrome.storage.onChanged.addListener((e,t)=>{if("local"===t){if(e["algovault.isZenith"]||e["algovault.zenithSlug"]){let e=(0,a.getLeetCodeProblemSlug)();chrome.storage.local.get(["algovault.isZenith","algovault.zenithSlug"],t=>{let n=!!t["algovault.isZenith"],o=t["algovault.zenithSlug"];m(l=n&&(!o||!e||o===e))})}e["algovault.zenithRevealed"]&&(s=!!e["algovault.zenithRevealed"].newValue,l&&c())}});let f=!1,b=!1,g=!1,h=!1,v=null,x=null;function y(){return location.pathname.includes("/submissions/")}let z=new Map,w=new Set,E=async()=>{let e=(0,a.getLeetCodeProblemSlug)();if(e)for(let t=0;t<3;t+=1){try{let t=await new Promise(t=>{chrome.runtime.sendMessage({action:"get_prediction",slug:e},t)});if(!t?.error){v=t,S();return}}catch(e){console.error("AlgoVault Prediction Error:",e)}await new Promise(e=>setTimeout(e,1e3))}},S=()=>{if(y())return;let e=(0,a.getLeetCodeProblemSlug)();e&&(x=e),b||g||chrome.storage.sync.get(["hideAcceptanceRate"],e=>{if(g=!0,!1===e.hideAcceptanceRate)return;let t=document.querySelector('[data-track-load="description_content"], #qd-content')||document.querySelector('div[class*="content__"]');if(t){let e=document.evaluate(".//*[text()='Accepted' or text()='Submissions']",t,null,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null);for(let t=0;t<e.snapshotLength;t++){let n=e.snapshotItem(t);if(n&&!n.closest('.monaco-editor, [class*="submission"], [class*="result"]')){let e=n.nextElementSibling;e&&e.textContent?.match(/\d/)||(e=n.parentElement?.nextElementSibling),e&&(e.style.display="none"),n.style.display="none"}}}let n=document.evaluate(".//*[text()='Acceptance' or text()='Acceptance Rate']",t||document,null,XPathResult.ANY_TYPE,null),o=n.iterateNext();if(o){let e=o.nextElementSibling;if(e&&e.textContent?.includes("%")||(e=o.parentElement?.nextElementSibling),e&&"none"!==e.style.display&&e.textContent?.includes("%")){let t=e.textContent||"";e.style.display="none";let n=document.createElement("div");n.className="text-label-1 dark:text-dark-label-1 font-medium flex items-center gap-2";let a=document.createElement("span");a.textContent="Hidden";let i=document.createElement("button");i.textContent="\uD83D\uDC41 Show",i.style.cursor="pointer",i.style.color="#00d4aa",i.style.fontSize="12px";let r=!1;i.onclick=()=>{r=!r,a.textContent=r?t:"Hidden",i.textContent=r?"\uD83D\uDC41 Hide":"\uD83D\uDC41 Show"},n.appendChild(a),n.appendChild(i),o.parentElement?.appendChild(n),b=!0}}});let{diffTag:t,metadataRow:n}=(()=>{let e=document.querySelector("[data-algovault-rating]");if(e&&e.parentElement){let t=Array.from(e.childNodes).filter(e=>e.nodeType===Node.TEXT_NODE||!e.classList?.contains("av-rating")).map(e=>e.textContent||"").join("").trim();if("Easy"===t||"Medium"===t||"Hard"===t)return{diffTag:e,metadataRow:e.parentElement};e.removeAttribute("data-algovault-rating"),e.querySelectorAll(".av-rating").forEach(e=>e.remove())}let t=document.querySelector('[data-track-load="description_content"], #qd-content, div[class*="content__"]')||document.body;t.querySelectorAll(".av-rating").forEach(e=>{let t=e.parentElement?.textContent?.replace(/\s*\(\d+\)\s*$/,"").trim()||"";"Easy"!==t&&"Medium"!==t&&"Hard"!==t&&e.remove()});let n=Array.from(t.querySelectorAll('div[class*="text-difficulty-"], div[class*="text-olive"], div[class*="text-yellow"], div[class*="text-pink"], span[class*="text-olive"], span[class*="text-yellow"], span[class*="text-pink"], [data-degree]'));for(let e of n){let t=e.textContent?.replace(/\s*\(\d+\)\s*$/,"").trim();if("Easy"===t||"Medium"===t||"Hard"===t)return{diffTag:e,metadataRow:e.parentElement}}let o=Array.from(t.querySelectorAll("div, span")),a=null;for(let e of o){if(e.querySelector('button, [role="button"], a, input, #av-company-trigger-btn, #av-start-zenith-btn'))continue;let t=Array.from(e.childNodes).filter(e=>e.nodeType===Node.TEXT_NODE||!e.classList?.contains("av-rating")).map(e=>e.textContent||"").join("").trim();if("Easy"===t||"Medium"===t||"Hard"===t){let t=e.parentElement;if(t){let n=t.textContent||"";if(n.includes("Topics")||n.includes("Companies")||n.includes("Hint")||t.classList.toString().includes("flex")||t.classList.toString().includes("items-center")||t.parentElement?.classList.toString().includes("flex")){a=e;break}}}}if(a&&a.parentElement)return{diffTag:a,metadataRow:a.parentElement};let i=Array.from(t.querySelectorAll('button, div[role="button"], a, div')).find(e=>{let t=e.textContent?.trim()||"";return"Topics"===t||"Companies"===t||t.startsWith("Topics")||t.startsWith("Companies")});if(i&&i.parentElement){let e=i.parentElement;for(let t of Array.from(e.children)){let n=Array.from(t.childNodes).filter(e=>e.nodeType===Node.TEXT_NODE||!e.classList?.contains("av-rating")).map(e=>e.textContent||"").join("").trim();if("Easy"===n||"Medium"===n||"Hard"===n)return{diffTag:t,metadataRow:e}}return{diffTag:null,metadataRow:e}}return{diffTag:null,metadataRow:null}})(),o=t?.getAttribute("data-algovault-rating");if(t&&e&&o!==e){t.setAttribute("data-algovault-rating",e),t.querySelector(".av-rating")?.remove();let n=n=>{if((0,a.getLeetCodeProblemSlug)()!==e||!Number.isFinite(n))return;let o=Math.round(Number(n)),i=t.querySelector(".av-rating");i&&i.remove();let r=document.createElement("span");r.className="av-rating ml-2 font-mono font-bold opacity-90",r.dataset.algovaultRating=e,r.textContent=` (${o})`,r.title="ZeroTrac contest rating",t.appendChild(r),f=!0};chrome.runtime.sendMessage({action:"get_problem_rating",slug:e},e=>{e&&"number"==typeof e.Rating&&n(e.Rating)})}let r=n||t?.parentElement;if(e&&r){let t=document.getElementById("av-company-trigger-btn"),n=t?.getAttribute("data-slug");if(!t||n!==e){t?.remove();let n=e.toLowerCase();if(!z.has(n)){!function(e){let t=e.toLowerCase();z.has(t)||w.has(t)||(w.add(t),chrome.runtime.sendMessage({action:"get_companies_for_problem",slug:t},e=>{w.delete(t),chrome.runtime.lastError||(z.set(t,Array.isArray(e?.evidences)?e.evidences:[]),a.getLeetCodeProblemSlug()?.toLowerCase()===t&&S())}))}(e);return}let o=z.get(n)||[];if(o.length>0){let t=r.parentElement||r,n=Array.from(t.querySelectorAll('button, div[role="button"], a')).find(e=>{if("av-company-trigger-btn"===e.id||e.closest("#av-company-trigger-btn"))return!1;let t=e.textContent?.trim()||"";return"Companies"===t||t.startsWith("Companies")||t.endsWith("Companies")});if(n||(n=Array.from(t.querySelectorAll("div, span, button, a")).find(e=>{if("av-company-trigger-btn"===e.id||e.closest("#av-company-trigger-btn"))return!1;let t=e.textContent?.trim()||"";return"Companies"===t||t.startsWith("Companies")})),!n){let e=document.querySelector('[data-track-load="description_content"], #qd-content, div[class*="content__"]')||t;n=Array.from(e.querySelectorAll('button, div[role="button"]')).find(e=>{if("av-company-trigger-btn"===e.id||e.closest("#av-company-trigger-btn"))return!1;let t=e.textContent?.trim()||"";return"Companies"===t||t.startsWith("Companies")})}let a=document.createElement("button");a.id="av-company-trigger-btn",a.setAttribute("data-slug",e),a.className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer transition-colors",a.title=`Asked by ${o.length} companies in interviews (Click to explore)`,a.innerHTML=`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.85; flex-shrink: 0;"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
          <span>Companies</span>
          <span style="font-size: 10px; color: #a1a1aa; font-family: ui-monospace, monospace; margin-left: 2px;">(${o.length})</span>
        `,Object.assign(a.style,{display:"inline-flex",alignItems:"center",gap:"5px",padding:"3px 10px",borderRadius:"9999px",fontSize:"12px",fontWeight:"500",backgroundColor:"rgba(255, 255, 255, 0.08)",color:"#d1d5db",border:"none",cursor:"pointer",transition:"all 0.15s ease",userSelect:"none",marginLeft:n?"0px":"6px",verticalAlign:"middle",boxSizing:"border-box"}),a.onmouseenter=()=>{a.style.backgroundColor="rgba(255, 255, 255, 0.15)",a.style.color="#ffffff"},a.onmouseleave=()=>{a.style.backgroundColor="rgba(255, 255, 255, 0.08)",a.style.color="#d1d5db"},a.onclick=e=>{e.preventDefault(),e.stopPropagation(),function(e,t){let n=document.getElementById("av-company-modal");if(n){n.remove();return}let o=document.createElement("div");o.id="av-company-modal",Object.assign(o.style,{position:"fixed",inset:"0",zIndex:"999999",backgroundColor:"rgba(0, 0, 0, 0.7)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui, -apple-system, sans-serif"});let a=document.createElement("div");Object.assign(a.style,{width:"480px",maxWidth:"92vw",maxHeight:"80vh",backgroundColor:"#121214",border:"1px solid rgba(223, 160, 84, 0.3)",borderRadius:"14px",boxShadow:"0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 20px rgba(223, 160, 84, 0.15)",display:"flex",flexDirection:"column",overflow:"hidden",color:"#e4e4e7"});let i=document.createElement("div");Object.assign(i.style,{padding:"14px 16px",borderBottom:"1px solid #27272a",display:"flex",alignItems:"center",justifyContent:"space-between",backgroundColor:"#18181b"}),i.innerHTML=`
      <div style="flex: 1;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 15px;">\ud83c</span>
          <span style="font-weight: 700; font-size: 13px; color: #f4f4f5;">Interview Companies</span>
          <span style="font-size: 10px; font-family: monospace; font-weight: 700; background: rgba(255, 161, 22, 0.15); color: #ffa116; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255, 161, 22, 0.3);">${t.length} Companies</span>
        </div>
        <div style="font-size: 11px; color: #a1a1aa; margin-top: 2px;">Verified LeetCode candidate submissions</div>
      </div>
      <button id="av-modal-close-btn" style="background: none; border: none; color: #a1a1aa; font-size: 16px; cursor: pointer; padding: 4px 8px; border-radius: 6px;">\u2715</button>
    `;let r=document.createElement("div");Object.assign(r.style,{padding:"10px 16px",borderBottom:"1px solid #27272a",backgroundColor:"#121214"});let l=document.createElement("input");l.placeholder="Search companies asking this question...",Object.assign(l.style,{width:"100%",backgroundColor:"#1c1c1f",border:"1px solid #3f3f46",borderRadius:"8px",padding:"7px 12px",fontSize:"12px",color:"#f4f4f5",outline:"none",boxSizing:"border-box"}),r.appendChild(l);let s=document.createElement("div");Object.assign(s.style,{padding:"12px 16px",overflowY:"auto",flex:"1",display:"flex",flexDirection:"column",gap:"8px"});let d=e=>{s.innerHTML="";let n=e.toLowerCase().trim(),o=t.filter(e=>e.companyName.toLowerCase().includes(n));if(0===o.length){let t=document.createElement("div");Object.assign(t.style,{textAlign:"center",color:"#71717a",fontSize:"12px",padding:"24px"}),t.textContent=`No companies found matching "${e}"`,s.appendChild(t);return}for(let e of o){let t=document.createElement("div");Object.assign(t.style,{padding:"10px 12px",borderRadius:"8px",backgroundColor:"#18181b",border:"1px solid #27272a",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"});let n=e.frequencyScore>=75?"#00b8a3":e.frequencyScore>=50?"#ffa116":"#a1a1aa";t.innerHTML=`
          <div style="min-width: 0; flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 600; font-size: 12px; color: #f4f4f5;">${e.companyName}</span>
              <span style="font-size: 9px; font-family: monospace; padding: 1px 5px; border-radius: 4px; background: rgba(255,255,255,0.06); color: #a1a1aa; border: 1px solid #3f3f46;">${e.timeframeLabel}</span>
            </div>
            <div style="margin-top: 6px; display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1; height: 4px; background: #27272a; border-radius: 9999px; overflow: hidden;">
                <div style="width: ${e.frequencyScore}%; height: 100%; background: ${n}; border-radius: 9999px;"></div>
              </div>
              <span style="font-size: 10px; font-family: monospace; font-weight: 700; color: ${n};">${Math.round(e.frequencyScore)}% Freq</span>
            </div>
          </div>
        `,s.appendChild(t)}};d(""),l.oninput=e=>d(e.target.value);let c=document.createElement("div");Object.assign(c.style,{padding:"10px 16px",borderTop:"1px solid #27272a",backgroundColor:"#18181b",display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:"11px",color:"#a1a1aa"}),c.innerHTML=`
      <span>Source: LeetCode Verified Interview Records</span>
      <span style="color: #ffa116; font-family: monospace; font-weight: 700;">AlgoVault</span>
    `,a.appendChild(i),a.appendChild(r),a.appendChild(s),a.appendChild(c),o.appendChild(a),document.body.appendChild(o),o.onclick=e=>{e.target===o&&o.remove()},i.querySelector("#av-modal-close-btn")?.addEventListener("click",()=>o.remove());let p=e=>{"Escape"===e.key&&(o.remove(),window.removeEventListener("keydown",p))};window.addEventListener("keydown",p)}(0,o)},n&&n.parentElement?(n.style.setProperty("display","none","important"),document.getElementById("av-company-trigger-btn")||n.parentElement.insertBefore(a,n)):r.appendChild(a)}}}if(document.getElementById("av-lists-btn")?.remove(),document.getElementById("av-start-zenith-btn")||l)l&&document.getElementById("av-start-zenith-btn")&&document.getElementById("av-start-zenith-btn")?.remove();else{var s,d;let e,t,n,o,r,l;let c=document.createElement("button");c.id="av-start-zenith-btn",c.innerHTML='<span style="font-size: 12px; margin-right: 4px;">\u26a1</span> ZENITH FOCUS',Object.assign(c.style,{position:"fixed",bottom:"24px",left:"24px",zIndex:"9999",display:"flex",alignItems:"center",justifyContent:"center",padding:"4px 12px",borderRadius:"9999px",backgroundColor:"#18181b",color:"#ffa116",fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',fontSize:"11px",fontWeight:"700",letterSpacing:"0.6px",textTransform:"uppercase",border:"1px solid rgba(255, 161, 22, 0.4)",boxShadow:"0 4px 14px rgba(0, 0, 0, 0.6), 0 0 10px rgba(255, 161, 22, 0.15)",backdropFilter:"blur(8px)",cursor:"pointer",userSelect:"none",transition:"all 0.2s ease"}),c.onmouseover=()=>{c.style.backgroundColor="#27272a",c.style.borderColor="rgba(255, 161, 22, 0.7)",c.style.boxShadow="0 4px 20px rgba(255, 161, 22, 0.3)"},c.onmouseleave=()=>{c.style.backgroundColor="#18181b",c.style.borderColor="rgba(255, 161, 22, 0.4)",c.style.boxShadow="0 4px 14px rgba(0, 0, 0, 0.6), 0 0 10px rgba(255, 161, 22, 0.15)"},s="algovault.zenithBtnPos",d=()=>{(0,i.showZenithFocusModal)(e=>{document.documentElement.requestFullscreen().catch(e=>{console.warn("Fullscreen request rejected:",e)});let t=(0,a.getLeetCodeProblemSlug)();t&&chrome.runtime.sendMessage({action:"session_start_v2",slug:t}),chrome.storage.local.set({"algovault.isZenith":!0,"algovault.zenithSlug":t||null,"algovault.zenithRevealed":!1,"algovault.zenithIntent":e.intent,"algovault.zenithTargetMinutes":e.targetMinutes,"algovault.zenithStartedAt":Date.now(),"algovault.zenithReason":"Pure Solve"},()=>{c.remove(),(0,i.showZenithToast)("Zenith Focus Mode active \u2022 Distraction shield enabled")})},()=>{})},e=!1,t=0,n=0,o=0,r=0,l=!1,chrome.storage.local.get(s,e=>{let t=e[s];t&&"number"==typeof t.left&&"number"==typeof t.top&&(c.style.bottom="auto",c.style.left=`${t.left}px`,c.style.top=`${t.top}px`)}),c.addEventListener("mousedown",a=>{if(0!==a.button)return;e=!0,l=!1,t=a.clientX,n=a.clientY;let i=c.getBoundingClientRect();o=i.left,r=i.top,c.style.transition="none",c.style.cursor="grabbing";let p=a=>{if(!e)return;let s=a.clientX-t,d=a.clientY-n;(Math.abs(s)>3||Math.abs(d)>3)&&(l=!0);let p=Math.max(10,Math.min(window.innerWidth-i.width-10,o+s)),u=Math.max(10,Math.min(window.innerHeight-i.height-10,r+d));c.style.bottom="auto",c.style.left=`${p}px`,c.style.top=`${u}px`},u=()=>{if(e=!1,c.style.cursor="pointer",c.style.transition="all 0.3s ease",window.removeEventListener("mousemove",p),window.removeEventListener("mouseup",u),l){let e=c.getBoundingClientRect();chrome.storage.local.set({[s]:{left:e.left,top:e.top}})}else d()};window.addEventListener("mousemove",p),window.addEventListener("mouseup",u)}),document.body.appendChild(c)}if(v&&!v.error&&!h&&t&&t.parentElement){let e=t.parentElement;if(!document.getElementById("av-solve-chance-bubble")){let{solveChance:t,expectedTimeMinutes:n,confidence:o}=v,a="number"==typeof t?Math.round(t):0,i="Stretch",r="rgba(239, 68, 68, 0.08)",l="rgba(239, 68, 68, 0.2)",s="#ef4444";a>=80?(i="Accessible",r="rgba(16, 185, 129, 0.08)",l="rgba(16, 185, 129, 0.2)",s="#10b981"):a>=40&&(i="Uncertain",r="rgba(245, 158, 11, 0.08)",l="rgba(245, 158, 11, 0.2)",s="#f59e0b");let d=o?o.charAt(0).toUpperCase()+o.slice(1).toLowerCase():"Medium",c=document.createElement("div");c.id="av-solve-chance-bubble",c.className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full",c.style.display="inline-flex",c.style.whiteSpace="nowrap",c.style.backgroundColor=r,c.style.border=`1px solid ${l}`,c.style.color=s,c.style.marginLeft="8px",c.innerHTML=`\u26a1 Practice estimate: <strong style="font-weight:700; margin-left:2px; margin-right:2px;">${i}</strong> (${a}%)`,e.appendChild(c);let p=document.createElement("div");p.id="av-confidence-bubble",p.className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full",p.style.display="inline-flex",p.style.whiteSpace="nowrap",p.style.backgroundColor="rgba(255, 255, 255, 0.03)",p.style.border="1px solid rgba(255, 255, 255, 0.08)",p.style.color="#c2c2c2",p.style.marginLeft="8px",p.innerHTML=`\ud83c Confidence: <strong style="font-weight:700; margin-left:2px;">${d}</strong>`,e.appendChild(p),h=!0}}},k=null,C=new MutationObserver(e=>{if(y()||k)return;let t=e.some(e=>{let t=e.target instanceof Element?e.target:e.target.parentElement;return!t?.closest(".monaco-editor, .view-lines, .CodeMirror, #algovault-post-solve, [id^='av-'], [class*='submission'], [data-track-load*='submission']")});t&&(k=window.setTimeout(()=>{k=null;let e=(0,a.getLeetCodeProblemSlug)(),t=!!(e&&e!==x),n=f&&!document.querySelector(".av-rating"),o=h&&!document.getElementById("av-solve-chance-bubble");(t||n||o||!x)&&(n&&(f=!1),o&&(h=!1),t&&(f=!1,h=!1,v=null,chrome.storage.local.get(["algovault.zenithSlug","algovault.isZenith"],t=>{t["algovault.isZenith"]&&t["algovault.zenithSlug"]&&t["algovault.zenithSlug"]!==e&&(l=!1,m(!1))}),E()),S(),l&&c())},500))});C.observe(document.body,{childList:!0,subtree:!0}),window.addEventListener("beforeunload",()=>{k&&clearTimeout(k),C.disconnect()}),setTimeout(()=>{y()||(E(),S())},1e3)},{"../lib/leetcode-url":"bUokv","./ZenithSystemOverlay":"wJlMj","@parcel/transformer-js/src/esmodule-helpers.js":"fRZO2"}],bUokv:[function(e,t,n){var o=e("@parcel/transformer-js/src/esmodule-helpers.js");function a(e=window.location.pathname){let t=e.match(/\/problems\/([^/?#]+)/);if(!t?.[1])return null;try{return decodeURIComponent(t[1]).trim().toLowerCase()||null}catch{return t[1].trim().toLowerCase()||null}}o.defineInteropFlag(n),o.export(n,"getLeetCodeProblemSlug",()=>a)},{"@parcel/transformer-js/src/esmodule-helpers.js":"fRZO2"}],fRZO2:[function(e,t,n){n.interopDefault=function(e){return e&&e.__esModule?e:{default:e}},n.defineInteropFlag=function(e){Object.defineProperty(e,"__esModule",{value:!0})},n.exportAll=function(e,t){return Object.keys(e).forEach(function(n){"default"===n||"__esModule"===n||t.hasOwnProperty(n)||Object.defineProperty(t,n,{enumerable:!0,get:function(){return e[n]}})}),t},n.export=function(e,t,n){Object.defineProperty(e,t,{enumerable:!0,get:n})}},{}],wJlMj:[function(e,t,n){var o=e("@parcel/transformer-js/src/esmodule-helpers.js");o.defineInteropFlag(n),o.export(n,"config",()=>a),o.export(n,"showZenithFocusModal",()=>s),o.export(n,"showZenithQuestModal",()=>d),o.export(n,"showZenithToast",()=>c),o.export(n,"showZenithAlarmModal",()=>p),o.export(n,"showZenithUnlockConfirmModal",()=>u);let a={matches:["https://leetcode.com/problems/*","https://leetcode.com/contest/*/problems/*"],run_at:"document_idle"},i=`
  @keyframes avFadeIn {
    from { opacity: 0; transform: scale(0.96) translate(-50%, -50%); }
    to { opacity: 1; transform: scale(1) translate(-50%, -50%); }
  }

  @keyframes avBgFadeIn {
    from { opacity: 0; backdrop-filter: blur(0px); }
    to { opacity: 1; backdrop-filter: blur(8px); }
  }

  @keyframes avToastSlide {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .av-zenith-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(9, 9, 11, 0.82);
    z-index: 2147483646;
    animation: avBgFadeIn 0.25s ease-out forwards;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .av-zenith-card {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 440px;
    max-width: 92vw;
    background: #18181b;
    border: 1px solid rgba(255, 161, 22, 0.35);
    border-radius: 14px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 30px rgba(255, 161, 22, 0.12);
    z-index: 2147483647;
    animation: avFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    padding: 24px;
    color: #f4f4f5;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    box-sizing: border-box;
  }

  .av-zenith-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .av-zenith-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 700;
    color: #f4f4f5;
    letter-spacing: -0.2px;
  }

  .av-zenith-badge {
    font-size: 10px;
    font-weight: 700;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    background: rgba(255, 161, 22, 0.15);
    color: #ffa116;
    padding: 2px 7px;
    border-radius: 9999px;
    border: 1px solid rgba(255, 161, 22, 0.3);
    letter-spacing: 0.5px;
  }

  .av-zenith-subtitle {
    font-size: 12px;
    color: #a1a1aa;
    line-height: 1.5;
    margin-bottom: 20px;
  }

  .av-zenith-features {
    background: #121214;
    border: 1px solid #27272a;
    border-radius: 10px;
    padding: 14px;
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .av-zenith-feature-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 12px;
    color: #d4d4d8;
    line-height: 1.4;
  }

  .av-zenith-feature-icon {
    font-size: 14px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .av-zenith-feature-text strong {
    color: #f4f4f5;
    font-weight: 600;
  }

  .av-zenith-label {
    font-size: 11px;
    font-weight: 600;
    color: #a1a1aa;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 8px;
  }

  .av-zenith-grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 18px;
  }

  .av-zenith-option-btn {
    border: 1px solid #27272a;
    background: #121214;
    border-radius: 8px;
    color: #a1a1aa;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    font-weight: 500;
    padding: 10px 8px;
    text-align: center;
    transition: all 0.15s ease;
  }

  .av-zenith-option-btn:hover {
    border-color: #3f3f46;
    color: #f4f4f5;
    background: #18181b;
  }

  .av-zenith-option-btn.is-active {
    border-color: rgba(255, 161, 22, 0.6);
    background: rgba(255, 161, 22, 0.1);
    color: #ffa116;
    font-weight: 600;
  }

  .av-zenith-actions {
    display: flex;
    gap: 10px;
    margin-top: 8px;
  }

  .av-zenith-btn-primary {
    flex: 1;
    background: #ffa116;
    color: #09090b;
    border: none;
    border-radius: 8px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    padding: 11px 16px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .av-zenith-btn-primary:hover {
    background: #ffb03a;
    box-shadow: 0 4px 12px rgba(255, 161, 22, 0.3);
  }

  .av-zenith-btn-secondary {
    background: transparent;
    color: #a1a1aa;
    border: 1px solid #27272a;
    border-radius: 8px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    padding: 11px 16px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .av-zenith-btn-secondary:hover {
    background: #27272a;
    color: #f4f4f5;
  }

  /* Toast Notification */
  .av-zenith-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    background: #18181b;
    border: 1px solid rgba(255, 161, 22, 0.4);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 161, 22, 0.15);
    border-radius: 8px;
    padding: 10px 16px;
    color: #f4f4f5;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: avToastSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    pointer-events: none;
  }

  /* Interruption Modal */
  .av-zenith-alert-card {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 400px;
    max-width: 92vw;
    background: #18181b;
    border: 1px solid rgba(245, 158, 11, 0.4);
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.85);
    z-index: 2147483647;
    animation: avFadeIn 0.25s ease-out forwards;
    padding: 22px;
    color: #f4f4f5;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-sizing: border-box;
  }
`,r=!1;function l(){if(r)return;let e=document.createElement("style");e.textContent=i,document.head.appendChild(e),r=!0}function s(e,t){l();let n=document.createElement("div");n.className="av-zenith-backdrop";let o=document.createElement("div");o.className="av-zenith-card",o.innerHTML=`
    <div class="av-zenith-header">
      <div class="av-zenith-title">
        <span>\u26a1</span> Zenith Focus Mode
      </div>
      <span class="av-zenith-badge">DEEP WORK</span>
    </div>
    <div class="av-zenith-subtitle">
      A distraction-free environment to build independent problem-solving skills under interview conditions.
    </div>

    <div class="av-zenith-features">
      <div class="av-zenith-feature-item">
        <span class="av-zenith-feature-icon">\ud83d\ufe0f</span>
        <div class="av-zenith-feature-text">
          <strong>Distraction Shield:</strong> Editorials, community solutions, discussions, topic tags, and hints are locked.
        </div>
      </div>
      <div class="av-zenith-feature-item">
        <span class="av-zenith-feature-icon">\u23f1\ufe0f</span>
        <div class="av-zenith-feature-text">
          <strong>Practice Engine:</strong> Active coding time, elapsed time, tab blur audits, and focus ratio are recorded.
        </div>
      </div>
      <div class="av-zenith-feature-item">
        <span class="av-zenith-feature-icon">\ud83d\ufe0f</span>
        <div class="av-zenith-feature-text">
          <strong>Fullscreen Immersion:</strong> Navigation headers and browser toolbars are hidden for full focus.
        </div>
      </div>
    </div>

    <div class="av-zenith-label">Target Duration</div>
    <div class="av-zenith-grid-3 av-zenith-durations">
      <button class="av-zenith-option-btn is-active" data-minutes="0">Stopwatch</button>
      <button class="av-zenith-option-btn" data-minutes="25">25 min (Sprint)</button>
      <button class="av-zenith-option-btn" data-minutes="45">45 min (Interview)</button>
    </div>

    <div class="av-zenith-label">Session Mode</div>
    <div class="av-zenith-grid-3 av-zenith-intents">
      <button class="av-zenith-option-btn is-active" data-intent="SOLO_SOLVE">Solo Solve</button>
      <button class="av-zenith-option-btn" data-intent="INTERVIEW_SIM">Interview Sim</button>
      <button class="av-zenith-option-btn" data-intent="SPEED_DRILL">Speed Drill</button>
    </div>

    <div class="av-zenith-actions">
      <button class="av-zenith-btn-secondary" id="av-zenith-cancel-btn">Cancel</button>
      <button class="av-zenith-btn-primary" id="av-zenith-start-btn">
        <span>\u26a1</span> Start Zenith Session
      </button>
    </div>
  `,o.addEventListener("click",e=>e.stopPropagation());let a=null;o.querySelectorAll(".av-zenith-durations .av-zenith-option-btn").forEach(e=>{e.addEventListener("click",()=>{o.querySelectorAll(".av-zenith-durations .av-zenith-option-btn").forEach(e=>e.classList.remove("is-active")),e.classList.add("is-active");let t=parseInt(e.dataset.minutes||"0",10);a=t>0?t:null})});let i="SOLO_SOLVE";o.querySelectorAll(".av-zenith-intents .av-zenith-option-btn").forEach(e=>{e.addEventListener("click",()=>{o.querySelectorAll(".av-zenith-intents .av-zenith-option-btn").forEach(e=>e.classList.remove("is-active")),e.classList.add("is-active"),i=e.dataset.intent||"SOLO_SOLVE"})});let r=()=>{n.remove(),o.remove()};o.querySelector("#av-zenith-start-btn")?.addEventListener("click",()=>{r(),e({intent:i,targetMinutes:a})}),o.querySelector("#av-zenith-cancel-btn")?.addEventListener("click",()=>{r(),t()}),n.addEventListener("click",()=>{r(),t()}),document.body.appendChild(n),document.body.appendChild(o)}function d(e,t){s(t=>e(t.intent),t)}function c(e){l(),document.querySelectorAll(".av-zenith-toast").forEach(e=>e.remove());let t=document.createElement("div");t.className="av-zenith-toast",t.innerHTML=`<span>\ud83d\ufe0f</span> <span>${e}</span>`,document.body.appendChild(t),setTimeout(()=>{t.style.transition="all 0.3s ease-in",t.style.opacity="0",t.style.transform="translateY(15px)",setTimeout(()=>t.remove(),350)},3500)}function p(e,t,n,o){l();let a=document.createElement("div");a.className="av-zenith-backdrop";let i=document.createElement("div");i.className="av-zenith-alert-card",i.innerHTML=`
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
      <span style="font-size:18px;">\u26a0\ufe0f</span>
      <span style="font-weight:700; font-size:15px; color:#f4f4f5;">Focus Interruption</span>
    </div>
    <div style="font-size:12px; color:#d4d4d8; line-height:1.5; margin-bottom:16px;">
      ${e}
    </div>
    <div style="font-size:11px; color:#a1a1aa; margin-bottom:20px; padding:8px 10px; background:#121214; border-radius:6px; border:1px solid #27272a;">
      Note: ${t}
    </div>
    <div style="display:flex; gap:10px;">
      <button id="av-zenith-alert-return" class="av-zenith-btn-primary" style="font-size:12px; padding:9px 12px;">
        Return to Focus
      </button>
      <button id="av-zenith-alert-continue" class="av-zenith-btn-secondary" style="font-size:12px; padding:9px 12px;">
        Continue
      </button>
    </div>
  `,i.addEventListener("click",e=>e.stopPropagation());let r=()=>{a.remove(),i.remove()};i.querySelector("#av-zenith-alert-return")?.addEventListener("click",()=>{r(),o()}),i.querySelector("#av-zenith-alert-continue")?.addEventListener("click",()=>{r(),n()}),a.addEventListener("click",()=>{r(),o()}),document.body.appendChild(a),document.body.appendChild(i)}function u(e,t){l();let n=document.createElement("div");n.className="av-zenith-backdrop";let o=document.createElement("div");o.className="av-zenith-alert-card",o.innerHTML=`
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
      <span style="font-size:18px;">\ud83d</span>
      <span style="font-weight:700; font-size:15px; color:#f4f4f5;">Unlock Solutions?</span>
    </div>
    <div style="font-size:12px; color:#d4d4d8; line-height:1.5; margin-bottom:16px;">
      This will reveal the Editorial, Solutions, Discussions, Topic Tags, and Hints for this problem.
    </div>
    <div style="font-size:11px; color:#a1a1aa; margin-bottom:20px; padding:8px 10px; background:#121214; border-radius:6px; border:1px solid #27272a;">
      Note: Your practice log will record that solutions were unlocked during this session.
    </div>
    <div style="display:flex; gap:10px;">
      <button id="av-zenith-confirm-keep-focus" class="av-zenith-btn-secondary" style="font-size:12px; padding:9px 12px; flex:1;">
        Keep Focusing
      </button>
      <button id="av-zenith-confirm-unlock" class="av-zenith-btn-primary" style="font-size:12px; padding:9px 12px; flex:1;">
        Unlock Solutions
      </button>
    </div>
  `,o.addEventListener("click",e=>e.stopPropagation());let a=()=>{n.remove(),o.remove()};o.querySelector("#av-zenith-confirm-keep-focus")?.addEventListener("click",()=>{a(),t()}),o.querySelector("#av-zenith-confirm-unlock")?.addEventListener("click",()=>{a(),e()}),n.addEventListener("click",()=>{a(),t()}),document.body.appendChild(n),document.body.appendChild(o)}},{"@parcel/transformer-js/src/esmodule-helpers.js":"fRZO2"}]},["2ZIMm"],"2ZIMm","parcelRequiree717"),globalThis.define=t;