const GRAPHQL_URL="https://leetcode.com/graphql"


async function leetCodeQuery (query : string, variables:any){

    const response = await fetch(GRAPHQL_URL, {
        method : "POST",
        headers:{
            "Content-Type":"application/json",
        },
        body:JSON.stringify({query,variables}), 
    });
    
    
    return response.json();
}


export async function getUserContestHistory(username:string){
    const query=`
        query userContestRankingInfo($username:String!){
            userContestRankingHistory(username:$username){
                attended
                contest{
                    title
                    titleSlug
                }
                ranking
            }
        }
    `;

    const data=await leetCodeQuery(query, {username});

    return data.data.userContestRankingHistory
        .filter((c:any)=>c.attended)
        .reverse()
        .slice(0,5);
}

export async function getContestQuestions(contestSlug: string) {
  const query = `
    query contestQuestionList($contestSlug: String!) {
      contestQuestionList(contestSlug: $contestSlug) {
        title
        titleSlug
        questionId
      }
    }
  `;

  console.log(" Fetching Questions for:", contestSlug);

  const data = await leetCodeQuery(query, { contestSlug: contestSlug });

  if (data.errors) {
    console.error(" API Error:", data.errors);
    throw new Error("LeetCode API Error");
  }

  return data.data.contestQuestionList;
}


export async function getReplayEvents(username: string, contestSlug: string, questionSlug: string) {
  const query = `
    query UserContestReplayEvents($contestSlug: String!, $questionSlug: String!, $username: String) {
      userContestReplayEvents(
        contestSlug: $contestSlug
        questionSlug: $questionSlug
        username: $username
      ) {
        eventType
        eventData
        timestamp
      }
    }
  `;
  const data = await leetCodeQuery(query, { contestSlug, questionSlug, username });
  return data.data.userContestReplayEvents || [];
}