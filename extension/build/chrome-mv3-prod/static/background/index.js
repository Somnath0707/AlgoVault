var e,t;"function"==typeof(e=globalThis.define)&&(t=e,e=null),function(t,n,s,r,o){var i="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{},a="function"==typeof i[r]&&i[r],l=a.cache||{},c="undefined"!=typeof module&&"function"==typeof module.require&&module.require.bind(module);function u(e,n){if(!l[e]){if(!t[e]){var s="function"==typeof i[r]&&i[r];if(!n&&s)return s(e,!0);if(a)return a(e,!0);if(c&&"string"==typeof e)return c(e);var o=Error("Cannot find module '"+e+"'");throw o.code="MODULE_NOT_FOUND",o}f.resolve=function(n){var s=t[e][1][n];return null!=s?s:n},f.cache={};var d=l[e]=new u.Module(e);t[e][0].call(d.exports,f,d,d.exports,this)}return l[e].exports;function f(e){var t=f.resolve(e);return!1===t?{}:u(t)}}u.isParcelRequire=!0,u.Module=function(e){this.id=e,this.bundle=u,this.exports={}},u.modules=t,u.cache=l,u.parent=a,u.register=function(e,n){t[e]=[function(e,t){t.exports=n},{}]},Object.defineProperty(u,"root",{get:function(){return i[r]}}),i[r]=u;for(var d=0;d<n.length;d++)u(n[d]);if(s){var f=u(s);"object"==typeof exports&&"undefined"!=typeof module?module.exports=f:"function"==typeof e&&e.amd?e(function(){return f}):o&&(this[o]=f)}}({kgW6q:[function(e,t,n){e("./messaging"),e("../../../background/index")},{"./messaging":"iG3ww","../../../background/index":"lSzt3"}],iG3ww:[function(e,t,n){var s=e("@parcel/transformer-js/src/esmodule-helpers.js"),r=e("~background/messages/get_prediction"),o=s.interopDefault(r),i=e("~background/messages/open_side_panel"),a=s.interopDefault(i),l=e("~background/messages/sync-leetcode"),c=s.interopDefault(l);globalThis.__plasmoInternalPortMap=new Map,chrome.runtime.onMessageExternal.addListener((e,t,n)=>(e?.name,!0)),chrome.runtime.onMessage.addListener((e,t,n)=>{switch(e.name){case"get_prediction":(0,o.default)({...e,sender:t},{send:e=>n(e)});break;case"open_side_panel":(0,a.default)({...e,sender:t},{send:e=>n(e)});break;case"sync-leetcode":(0,c.default)({...e,sender:t},{send:e=>n(e)})}return!0}),chrome.runtime.onConnect.addListener(function(e){globalThis.__plasmoInternalPortMap.set(e.name,e),e.onMessage.addListener(function(t){e.name})})},{"~background/messages/get_prediction":"23aOW","~background/messages/open_side_panel":"bz6Iy","~background/messages/sync-leetcode":"2HaJD","@parcel/transformer-js/src/esmodule-helpers.js":"f6DG4"}],"23aOW":[function(e,t,n){e("@parcel/transformer-js/src/esmodule-helpers.js").defineInteropFlag(n);var s=e("../../lib/constants");let r=async(e,t)=>{let{slug:n}=e.body;try{let e=await fetch(`${s.BACKEND_URL}/api/predict/${n}`);if(!e.ok)throw Error("Failed");t.send(await e.json())}catch(e){t.send({solveChance:76,expectedTimeMinutes:18,confidence:"HIGH"})}};n.default=r},{"../../lib/constants":"agBFt","@parcel/transformer-js/src/esmodule-helpers.js":"f6DG4"}],agBFt:[function(e,t,n){var s=e("@parcel/transformer-js/src/esmodule-helpers.js");s.defineInteropFlag(n),s.export(n,"LEETCODE_GRAPHQL_URL",()=>r),s.export(n,"ZEROTRAC_URL",()=>o),s.export(n,"BACKEND_URL",()=>i);let r="https://leetcode.com/graphql/",o="https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/data.json",i="http://localhost:8080"},{"@parcel/transformer-js/src/esmodule-helpers.js":"f6DG4"}],f6DG4:[function(e,t,n){n.interopDefault=function(e){return e&&e.__esModule?e:{default:e}},n.defineInteropFlag=function(e){Object.defineProperty(e,"__esModule",{value:!0})},n.exportAll=function(e,t){return Object.keys(e).forEach(function(n){"default"===n||"__esModule"===n||t.hasOwnProperty(n)||Object.defineProperty(t,n,{enumerable:!0,get:function(){return e[n]}})}),t},n.export=function(e,t,n){Object.defineProperty(e,t,{enumerable:!0,get:n})}},{}],bz6Iy:[function(e,t,n){e("@parcel/transformer-js/src/esmodule-helpers.js").defineInteropFlag(n);let s=async(e,t)=>{if(e.body?.action==="open_side_panel"){let n=e.sender?.tab?.id;n?(chrome.sidePanel.open({tabId:n}),t.send({status:"success"})):t.send({error:"No tab ID"})}};n.default=s},{"@parcel/transformer-js/src/esmodule-helpers.js":"f6DG4"}],"2HaJD":[function(e,t,n){e("@parcel/transformer-js/src/esmodule-helpers.js").defineInteropFlag(n);var s=e("../../lib/api/leetcode"),r=e("../../lib/constants");let o=(e,t,n=0,s=0)=>{chrome.storage.local.set({syncStatus:{status:e,message:t,count:n,subCount:s}})},i=async(e,t)=>{let{action:n,username:i}=e.body||{};if("sync_history"===n&&i){console.log(`Starting LeetCode history sync for user: ${i}`),o("RUNNING","Fetching profile...",0,0);try{let e=await (0,s.fetchUserProfile)(i),n=e.data?.matchedUser?.submitStats?.acSubmissionNum?.find(e=>"All"===e.difficulty)?.count||0,a=[],l=0;for(;l<n;){o("RUNNING",`Fetching problems (${l}/${n})...`,a.length,0);let e=await (0,s.fetchSolvedProblems)(l,50),t=e.data?.problemsetQuestionList?.questions||[];a.push(...t),l+=50,await new Promise(e=>setTimeout(e,500))}let c=[];o("RUNNING","Fetching contest history...",a.length,c.length);let u=await (0,s.fetchContestHistory)(i),d=u.data?.userContestRankingHistory||[],f=u.data?.userContestRanking;o("RUNNING","Pushing data to AlgoVault backend...",a.length,c.length);let p={username:i,profile:e.data?.matchedUser?.profile,solvedProblems:a,submissions:c,contestRanking:f,contestHistory:d},m=await fetch(`${r.BACKEND_URL}/api/sync/leetcode`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)});if(!m.ok)throw Error(`Backend rejected sync payload: ${m.status}`);o("SUCCESS","Data synced successfully!",a.length,c.length),t.send({status:"success",count:a.length,subCount:c.length})}catch(e){console.error("Sync failed:",e),o("ERROR",`Sync failed: ${e.toString()}`),t.send({status:"error",message:e.toString()})}}else t.send({error:"Unknown action or missing username"})};n.default=i},{"../../lib/api/leetcode":"e53iR","../../lib/constants":"agBFt","@parcel/transformer-js/src/esmodule-helpers.js":"f6DG4"}],e53iR:[function(e,t,n){var s=e("@parcel/transformer-js/src/esmodule-helpers.js");s.defineInteropFlag(n),s.export(n,"fetchGraphQL",()=>o),s.export(n,"fetchUserProfile",()=>i),s.export(n,"fetchSolvedProblems",()=>a),s.export(n,"fetchAllSubmissions",()=>l),s.export(n,"fetchContestHistory",()=>c);var r=e("../constants");let o=async(e,t={})=>{let n=await fetch(r.LEETCODE_GRAPHQL_URL,{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://leetcode.com",Referer:"https://leetcode.com/"},credentials:"include",body:JSON.stringify({query:e,variables:t})});if(!n.ok)throw Error(`LeetCode API error: ${n.status} ${n.statusText}`);return n.json()},i=async e=>{let t=`
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
  `;return o(t,{username:e})},a=async(e,t)=>{let n=`
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
  `;return o(n,{categorySlug:"",skip:e,limit:t,filters:{status:"AC"}})},l=async(e,t)=>{let n=`
    query submissionList($offset: Int!, $limit: Int!, $questionSlug: String!) {
      submissionList(offset: $offset, limit: $limit, questionSlug: $questionSlug) {
        hasNext
        submissions {
          id
          title
          titleSlug
          statusDisplay
          lang
          runtime
          memory
          timestamp
        }
      }
    }
  `;return o(n,{offset:e,limit:t,questionSlug:""})},c=async e=>{let t=`
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
  `;return o(t,{username:e})}},{"../constants":"agBFt","@parcel/transformer-js/src/esmodule-helpers.js":"f6DG4"}],lSzt3:[function(e,t,n){var s=e("../lib/api/leetcode");async function r(e){let t=(e,t,n=0,s=0)=>{chrome.storage.local.set({syncStatus:{status:e,message:t,count:n,subCount:s}})};try{t("RUNNING","Fetching user profile...");let n=await (0,s.fetchUserProfile)(e);if(!n.data?.matchedUser)throw Error("User not found on LeetCode");let r=n.data.matchedUser;t("RUNNING","Fetching solved problems...",0,0);let o=await (0,s.fetchSolvedProblems)(0,5e3),i=o.data?.problemsetQuestionList?.questions||[];t("RUNNING","Fetching submissions...",i.length,0);let a=await (0,s.fetchAllSubmissions)(0,1e3),l=a.data?.submissionList?.submissions||[];t("RUNNING","Fetching contest history...",i.length,l.length);let c=await (0,s.fetchContestHistory)(e),u=c.data?.userContestRankingHistory||[],d=c.data?.userContestRanking||null;t("RUNNING","Pushing to AlgoVault backend...",i.length,l.length);let f={username:e,profile:r.profile,solvedProblems:i,submissions:l,contestHistory:u,contestRanking:d},p=await fetch("http://localhost:8080/api/sync/leetcode",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(f)});if(!p.ok){let e=await p.text();throw Error(`Backend sync failed: ${e}`)}t("SUCCESS","Sync completed successfully!",i.length,l.length)}catch(e){console.error("Sync Error:",e),t("ERROR",e.message||"An unknown error occurred during sync")}}chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:!0}).catch(e=>console.error(e)),chrome.runtime.onMessage.addListener((e,t,n)=>{if("open_side_panel"===e.action&&t.tab&&chrome.sidePanel.open({windowId:t.tab.windowId}),"get_prediction"===e.action)return fetch(`http://localhost:8080/api/predictions/${e.slug}?userId=1`).then(e=>{if(!e.ok)throw Error("Failed to fetch prediction");return e.json()}).then(e=>n(e)).catch(e=>n({error:e.message})),!0;"sync_history"===e.action&&r(e.username).catch(console.error)})},{"../lib/api/leetcode":"e53iR"}]},["kgW6q"],"kgW6q","parcelRequiree717"),globalThis.define=t;