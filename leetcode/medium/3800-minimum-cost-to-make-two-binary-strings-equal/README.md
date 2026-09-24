<h2><a href="https://leetcode.com/problems/minimum-cost-to-make-two-binary-strings-equal/">3800. Minimum Cost to Make Two Binary Strings Equal</a></h2><h3>Medium</h3><hr><p>You are given two binary strings <code>s</code> and <code>t</code>, both of length <code>n</code>, and three <strong>positive</strong> integers <code>flipCost</code>, <code>swapCost</code>, and <code>crossCost</code>.</p>

<p>You are allowed to apply the following operations any number of times (in any order) to the strings <code>s</code> and <code>t</code>:</p>

<ul>
	<li>Choose any index <code>i</code> and flip <code>s[i]</code> or <code>t[i]</code> (change <code>&#39;0&#39;</code> to <code>&#39;1&#39;</code> or <code>&#39;1&#39;</code> to <code>&#39;0&#39;</code>). The cost of this operation is <code>flipCost</code>.</li>
	<li>Choose two <strong>distinct</strong> indices <code>i</code> and <code>j</code>, and swap either <code>s[i]</code> and <code>s[j]</code> or <code>t[i]</code> and <code>t[j]</code>. The cost of this operation is <code>swapCost</code>.</li>
	<li>Choose an index <code>i</code> and swap <code>s[i]</code> with <code>t[i]</code>. The cost of this operation is <code>crossCost</code>.</li>
</ul>

<p>Return an integer denoting the <strong>minimum</strong> total cost needed to make the strings <code>s</code> and <code>t</code> equal.</p>

<p>&nbsp;</p>
<p><strong class="example">Example 1:</strong></p>

<div class="example-block">
<p><strong>Input:</strong> <span class="example-io">s = &quot;01000&quot;, t = &quot;10111&quot;, flipCost = 10, swapCost = 2, crossCost = 2</span></p>

<p><strong>Output:</strong> <span class="example-io">16</span></p>

<p><strong>Explanation:</strong></p>

<p>We can perform the following operations:</p>

<ul>
	<li>Swap <code>s[0]</code> and <code>s[1]</code> (<code>swapCost = 2</code>). After this operation, <code>s = &quot;10000&quot;</code> and <code>t = &quot;10111&quot;</code>.</li>
	<li>Cross swap <code>s[2]</code> and <code>t[2]</code> (<code>crossCost = 2</code>). After this operation, <code>s = &quot;10100&quot;</code> and <code>t = &quot;10011&quot;</code>.</li>
	<li>Swap <code>s[2]</code> and <code>s[3]</code> (<code>swapCost = 2</code>). After this operation, <code>s = &quot;10010&quot;</code> and <code>t = &quot;10011&quot;</code>.</li>
	<li>Flip <code>s[4]</code> (<code>flipCost = 10</code>). After this operation, <code>s = t = &quot;10011&quot;</code>.</li>
</ul>

<p>The total cost is <code>2 + 2 + 2 + 10 = 16</code>.</p>
</div>

<p><strong class="example">Example 2:</strong></p>

<div class="example-block">
<p><strong>Input:</strong> <span class="example-io">s = &quot;001&quot;, t = &quot;110&quot;, flipCost = 2, swapCost = 100, crossCost = 100</span></p>

<p><strong>Output:</strong> <span class="example-io">6</span></p>

<p><strong>Explanation:</strong></p>

<p>Flipping all the bits of <code>s</code> makes the strings equal, and the total cost is <code>3 * flipCost = 3 * 2 = 6</code>.</p>
</div>

<p><strong class="example">Example 3:</strong></p>

<div class="example-block">
<p><strong>Input:</strong> <span class="example-io">s = &quot;1010&quot;, t = &quot;1010&quot;, flipCost = 5, swapCost = 5, crossCost = 5</span></p>

<p><strong>Output:</strong> <span class="example-io">0</span></p>

<p><strong>Explanation:</strong></p>

<p>The strings are already equal, so no operations are required.</p>
</div>

<p>&nbsp;</p>
<p><strong>Constraints:</strong></p>

<ul>
	<li><code>n == s.length == t.length</code></li>
	<li><code>1 &lt;= n &lt;= 10<sup>5</sup></code>​​​​​​​</li>
	<li><code>1 &lt;= flipCost, swapCost, crossCost &lt;= 10<sup>9</sup></code></li>
	<li><code>s</code> and <code>t</code> consist only of the characters <code>&#39;0&#39;</code> and <code>&#39;1&#39;</code>.</li>
</ul>
