export function attachInterceptor() {

  // @ts-ignore
  const realWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  const originalFetch = realWindow.fetch;

  realWindow.fetch = async (...args: any[]) => {
    const [resource, config] = args;

    if (typeof resource === 'string' && resource.includes('/check/')) {
      try {
        const response = await originalFetch(resource, config);
        const clone = response.clone();
        
        clone.json().then((data: any) => {

          if (data.state === 'SUCCESS') {
             
             const submissionId = String(data.submission_id || "");
             
             //ignore all the cases for "run" code
             if (submissionId.includes("runcode")) {
              //  console.log("Codeleet: Ignoring 'Run Code' result");
               return; 
             }

            //  console.log("JUDGEMENT COMPLETE:", data.status_msg);
             
             realWindow.dispatchEvent(new CustomEvent('leetcode-submission', { 
               detail: { 
                 status: data.status_code,
                 msg: data.status_msg,
                 correct: data.total_correct,
                 total: data.total_testcases
               } 
             }));
           }
        }).catch((err: any) => console.error("Interceptor JSON Error", err));

        return response;

      } catch (err) {
        console.error("Interceptor Network Error", err);
      }
    }

    return originalFetch(...args);
  };
}