async function test() {
  const res = await fetch('https://leetcode.com/api/submissions/?offset=0&limit=20');
  const text = await res.text();
  console.log(text.substring(0, 200));
}
test();
