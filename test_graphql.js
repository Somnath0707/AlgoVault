async function test() {
  const query = `
    query submissionList($offset: Int!, $limit: Int!, $questionSlug: String!) {
      submissionList(offset: $offset, limit: $limit, questionSlug: $questionSlug) {
        hasNext
        submissions {
          id
          title
        }
      }
    }
  `;
  const res = await fetch('https://leetcode.com/graphql/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { offset: 0, limit: 20, questionSlug: "" } })
  });
  const json = await res.json();
  console.log(JSON.stringify(json));
}
test();
