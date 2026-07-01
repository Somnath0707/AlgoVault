export interface StudyProblem {
  slug: string
  title: string
  topic: string
}

export interface StudyList {
  id: string
  name: string
  description: string
  sourceUrl: string
  problems: StudyProblem[]
}

const titleFromSlug = (slug: string) => slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
const group = (topic: string, slugs: string[]): StudyProblem[] => slugs.map((slug) => ({ slug, title: titleFromSlug(slug), topic }))

const neetcode150 = [
  ...group("Arrays & Hashing", ["contains-duplicate", "valid-anagram", "two-sum", "group-anagrams", "top-k-frequent-elements", "product-of-array-except-self", "valid-sudoku", "encode-and-decode-strings", "longest-consecutive-sequence"]),
  ...group("Two Pointers", ["valid-palindrome", "two-sum-ii-input-array-is-sorted", "3sum", "container-with-most-water", "trapping-rain-water"]),
  ...group("Sliding Window", ["best-time-to-buy-and-sell-stock", "longest-substring-without-repeating-characters", "longest-repeating-character-replacement", "permutation-in-string", "minimum-window-substring", "sliding-window-maximum"]),
  ...group("Stack", ["valid-parentheses", "min-stack", "evaluate-reverse-polish-notation", "generate-parentheses", "daily-temperatures", "car-fleet", "largest-rectangle-in-histogram"]),
  ...group("Binary Search", ["binary-search", "search-a-2d-matrix", "koko-eating-bananas", "find-minimum-in-rotated-sorted-array", "search-in-rotated-sorted-array", "time-based-key-value-store", "median-of-two-sorted-arrays"]),
  ...group("Linked List", ["reverse-linked-list", "merge-two-sorted-lists", "reorder-list", "remove-nth-node-from-end-of-list", "copy-list-with-random-pointer", "add-two-numbers", "linked-list-cycle", "find-the-duplicate-number", "lru-cache", "merge-k-sorted-lists", "reverse-nodes-in-k-group"]),
  ...group("Trees", ["invert-binary-tree", "maximum-depth-of-binary-tree", "diameter-of-binary-tree", "balanced-binary-tree", "same-tree", "subtree-of-another-tree", "lowest-common-ancestor-of-a-binary-search-tree", "binary-tree-level-order-traversal", "binary-tree-right-side-view", "count-good-nodes-in-binary-tree", "validate-binary-search-tree", "kth-smallest-element-in-a-bst", "construct-binary-tree-from-preorder-and-inorder-traversal", "binary-tree-maximum-path-sum", "serialize-and-deserialize-binary-tree"]),
  ...group("Tries", ["implement-trie-prefix-tree", "design-add-and-search-words-data-structure", "word-search-ii"]),
  ...group("Heap / Priority Queue", ["kth-largest-element-in-a-stream", "last-stone-weight", "k-closest-points-to-origin", "kth-largest-element-in-an-array", "task-scheduler", "design-twitter", "find-median-from-data-stream"]),
  ...group("Backtracking", ["subsets", "combination-sum", "permutations", "subsets-ii", "combination-sum-ii", "word-search", "palindrome-partitioning", "letter-combinations-of-a-phone-number", "n-queens"]),
  ...group("Graphs", ["number-of-islands", "max-area-of-island", "clone-graph", "walls-and-gates", "rotting-oranges", "pacific-atlantic-water-flow", "surrounded-regions", "course-schedule", "course-schedule-ii", "graph-valid-tree", "number-of-connected-components-in-an-undirected-graph", "redundant-connection", "word-ladder"]),
  ...group("Advanced Graphs", ["reconstruct-itinerary", "min-cost-to-connect-all-points", "network-delay-time", "swim-in-rising-water", "alien-dictionary", "cheapest-flights-within-k-stops"]),
  ...group("1-D Dynamic Programming", ["climbing-stairs", "min-cost-climbing-stairs", "house-robber", "house-robber-ii", "longest-palindromic-substring", "palindromic-substrings", "decode-ways", "coin-change", "maximum-product-subarray", "word-break", "longest-increasing-subsequence", "partition-equal-subset-sum"]),
  ...group("2-D Dynamic Programming", ["unique-paths", "longest-common-subsequence", "best-time-to-buy-and-sell-stock-with-cooldown", "coin-change-ii", "target-sum", "interleaving-string", "longest-increasing-path-in-a-matrix", "distinct-subsequences", "edit-distance", "burst-balloons", "regular-expression-matching"]),
  ...group("Greedy", ["maximum-subarray", "jump-game", "jump-game-ii", "gas-station", "hand-of-straights", "merge-triplets-to-form-target-triplet", "partition-labels", "valid-parenthesis-string"]),
  ...group("Intervals", ["insert-interval", "merge-intervals", "non-overlapping-intervals", "meeting-rooms", "meeting-rooms-ii", "minimum-interval-to-include-each-query"]),
  ...group("Math & Geometry", ["rotate-image", "spiral-matrix", "set-matrix-zeroes", "happy-number", "plus-one", "powx-n", "multiply-strings", "detect-squares"]),
  ...group("Bit Manipulation", ["single-number", "number-of-1-bits", "counting-bits", "reverse-bits", "missing-number", "sum-of-two-integers", "reverse-integer"])
]

const striverSde = [
  ...group("Arrays", ["set-matrix-zeroes", "pascals-triangle", "next-permutation", "maximum-subarray", "sort-colors", "best-time-to-buy-and-sell-stock", "rotate-image", "merge-intervals", "merge-sorted-array", "find-the-duplicate-number", "search-a-2d-matrix", "powx-n", "majority-element", "majority-element-ii", "unique-paths", "reverse-pairs", "two-sum", "4sum", "longest-consecutive-sequence", "longest-substring-without-repeating-characters"]),
  ...group("Linked List", ["reverse-linked-list", "middle-of-the-linked-list", "merge-two-sorted-lists", "remove-nth-node-from-end-of-list", "delete-node-in-a-linked-list", "add-two-numbers", "intersection-of-two-linked-lists", "linked-list-cycle", "reverse-nodes-in-k-group", "palindrome-linked-list", "linked-list-cycle-ii", "rotate-list", "copy-list-with-random-pointer"]),
  ...group("Greedy", ["assign-cookies", "jump-game", "jump-game-ii", "gas-station", "non-overlapping-intervals", "partition-labels"]),
  ...group("Recursion & Backtracking", ["subsets-ii", "combination-sum", "combination-sum-ii", "palindrome-partitioning", "permutation-sequence", "permutations", "n-queens", "sudoku-solver", "word-break"]),
  ...group("Binary Search", ["single-element-in-a-sorted-array", "search-in-rotated-sorted-array", "median-of-two-sorted-arrays", "find-minimum-in-rotated-sorted-array", "koko-eating-bananas", "search-a-2d-matrix"]),
  ...group("Stack & Queue", ["implement-stack-using-queues", "implement-queue-using-stacks", "valid-parentheses", "next-greater-element-i", "largest-rectangle-in-histogram", "sliding-window-maximum", "min-stack", "rotting-oranges", "online-stock-span"]),
  ...group("Trees", ["binary-tree-inorder-traversal", "binary-tree-preorder-traversal", "binary-tree-postorder-traversal", "binary-tree-right-side-view", "vertical-order-traversal-of-a-binary-tree", "symmetric-tree", "binary-tree-level-order-traversal", "maximum-depth-of-binary-tree", "diameter-of-binary-tree", "balanced-binary-tree", "lowest-common-ancestor-of-a-binary-tree", "same-tree", "binary-tree-maximum-path-sum", "construct-binary-tree-from-preorder-and-inorder-traversal", "serialize-and-deserialize-binary-tree", "flatten-binary-tree-to-linked-list"]),
  ...group("Binary Search Tree", ["populate-next-right-pointers-in-each-node", "search-in-a-binary-search-tree", "construct-binary-search-tree-from-preorder-traversal", "validate-binary-search-tree", "lowest-common-ancestor-of-a-binary-search-tree", "kth-smallest-element-in-a-bst", "two-sum-iv-input-is-a-bst"]),
  ...group("Graphs", ["clone-graph", "graph-valid-tree", "redundant-connection", "course-schedule-ii", "number-of-connected-components-in-an-undirected-graph", "number-of-islands", "is-graph-bipartite", "course-schedule", "network-delay-time"]),
  ...group("Dynamic Programming", ["maximum-product-subarray", "longest-increasing-subsequence", "longest-common-subsequence", "house-robber", "edit-distance", "target-sum", "burst-balloons", "minimum-path-sum", "coin-change", "partition-equal-subset-sum"]),
  ...group("Tries & Strings", ["implement-trie-prefix-tree", "maximum-xor-of-two-numbers-in-an-array", "word-search-ii", "longest-palindromic-substring", "reverse-words-in-a-string", "roman-to-integer", "find-the-index-of-the-first-occurrence-in-a-string", "longest-common-prefix"])
]

export const STUDY_LISTS: StudyList[] = [
  { id: "neetcode-150", name: "NeetCode 150", description: "150 interview problems grouped by pattern", sourceUrl: "https://neetcode.io/practice", problems: neetcode150 },
  { id: "striver-sde", name: "Striver SDE", description: "LeetCode-compatible problems from the Striver SDE sheet", sourceUrl: "https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems", problems: striverSde }
]
