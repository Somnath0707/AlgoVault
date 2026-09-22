import React, { useState, useEffect } from "react"
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Zap, Edit3, Repeat, Network, GitBranch } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export interface SimulationStep {
  stepIndex: number
  description: string
  array?: number[]
  stack?: number[]
  leftPointer?: number
  rightPointer?: number
  midPointer?: number
  windowRange?: [number, number]
  highlightIndices?: number[]
  activeCodeLine: number
  variables: Record<string, string | number>
  
  // Custom Visualizer Properties
  activeNodeId?: number
  visitedNodeIds?: number[]
  queueState?: number[]
  gridState?: number[][]
  activeGridCell?: [number, number]
  visitedGridCells?: string[]
  dsuParents?: number[]
  inDegrees?: number[]
  topoQueue?: number[]
  topoResult?: number[]
  dpTable?: number[]
  intervalsState?: { start: number; end: number; label: string; merged?: boolean; active?: boolean }[]
  linkedListCycle?: boolean
}

export interface SimulationConfig {
  inputArray: number[]
  targetVal: number
  kVal: number
  hasCycle: boolean
  gridMatrix: number[][]
}

// ─────────────────────────────────────────────────────────────────────────────
// ALL 16 DYNAMIC SIMULATION GENERATOR MATRIX
// ─────────────────────────────────────────────────────────────────────────────

export function generateDynamicSimulation(patternId: string, config: SimulationConfig) {
  const nums = config.inputArray.length > 0 ? config.inputArray : [3, 1, 4, 2, 5]
  const N = nums.length
  const target = config.targetVal
  const k = config.kVal

  // 1. Prefix Sum
  if (patternId === "prefix-sum") {
    const P = [0]
    const steps: SimulationStep[] = [
      {
        stepIndex: 0,
        description: `Initialize prefix array P with P[0] = 0.`,
        array: [0, ...new Array(N).fill(0)],
        activeCodeLine: 0,
        variables: { "P[0]": 0, input: `[${nums.join(", ")}]` }
      }
    ]

    for (let i = 0; i < N; i++) {
      const nextSum = P[i] + nums[i]
      P.push(nextSum)
      const currentP = [...P, ...new Array(N - i - 1).fill(0)]
      steps.push({
        stepIndex: i + 1,
        description: `i = ${i} (val = ${nums[i]}): P[${i + 1}] = P[${i}] + ${nums[i]} = ${nextSum}.`,
        array: currentP,
        highlightIndices: [i + 1],
        activeCodeLine: 2,
        variables: { i, [`nums[${i}]`]: nums[i], [`P[${i + 1}]`]: nextSum }
      })
    }

    const queryL = 1
    const queryR = Math.min(Math.max(1, Math.floor(N / 2)), N - 1)
    const ans = P[queryR + 1] - P[queryL]
    steps.push({
      stepIndex: steps.length,
      description: `QUERY sum(${queryL}..${queryR}): P[${queryR + 1}] - P[${queryL}] = ${P[queryR + 1]} - ${P[queryL]} = ${ans} in O(1) time!`,
      array: P,
      highlightIndices: [queryL, queryR + 1],
      activeCodeLine: 4,
      variables: { [`P[${queryR + 1}]`]: P[queryR + 1], [`P[${queryL}]`]: P[queryL], RangeSum: ans }
    })

    return {
      type: "array",
      title: "Prefix Sum Range Queries",
      subtitle: `Input: [${nums.join(", ")}]. Range query in O(1) time.`,
      code: [
        "P = [0] * (len(nums) + 1)",
        "for i in range(len(nums)):",
        "    P[i+1] = P[i] + nums[i]",
        "# Query sum(L..R)",
        "range_sum = P[R+1] - P[L]"
      ],
      steps
    }
  }

  // 2. Two Pointers
  if (patternId === "two-pointers") {
    let L = 0
    let R = N - 1
    const sorted = [...nums].sort((a, b) => a - b)
    const targetSum = target || (sorted[0] + sorted[N - 1])
    const steps: SimulationStep[] = []

    steps.push({
      stepIndex: 0,
      description: `Sorted array. L = 0 (val ${sorted[L]}), R = ${R} (val ${sorted[R]}). Target Sum = ${targetSum}.`,
      array: sorted,
      leftPointer: L,
      rightPointer: R,
      activeCodeLine: 0,
      variables: { L, R, sum: sorted[L] + sorted[R], target: targetSum }
    })

    while (L < R) {
      const sum = sorted[L] + sorted[R]
      if (sum === targetSum) {
        steps.push({
          stepIndex: steps.length,
          description: `MATCH FOUND! Sum ${sorted[L]} + ${sorted[R]} = ${sum} == ${targetSum} at indices [${L}, ${R}]!`,
          array: sorted,
          leftPointer: L,
          rightPointer: R,
          highlightIndices: [L, R],
          activeCodeLine: 3,
          variables: { L, R, sum, status: "MATCH_FOUND" }
        })
        break
      } else if (sum < targetSum) {
        steps.push({
          stepIndex: steps.length,
          description: `Sum ${sorted[L]} + ${sorted[R]} = ${sum} < ${targetSum}. Shift Left pointer L to ${L + 1}.`,
          array: sorted,
          leftPointer: L + 1,
          rightPointer: R,
          activeCodeLine: 4,
          variables: { L: L + 1, R, sum, target: targetSum }
        })
        L++
      } else {
        steps.push({
          stepIndex: steps.length,
          description: `Sum ${sorted[L]} + ${sorted[R]} = ${sum} > ${targetSum}. Shift Right pointer R to ${R - 1}.`,
          array: sorted,
          leftPointer: L,
          rightPointer: R - 1,
          activeCodeLine: 5,
          variables: { L, R: R - 1, sum, target: targetSum }
        })
        R--
      }
    }

    return {
      type: "array",
      title: "Two Pointers Inward Convergence",
      subtitle: `Find pair in sorted array [${sorted.join(", ")}] summing to ${targetSum}.`,
      code: [
        "L = 0, R = len(nums) - 1",
        "while L < R:",
        "    sum = nums[L] + nums[R]",
        "    if sum == target: return [L, R]",
        "    elif sum < target: L += 1",
        "    else: R -= 1"
      ],
      steps
    }
  }

  // 3. Sliding Window
  if (patternId === "sliding-window") {
    let L = 0
    let currentSum = 0
    let maxLen = 0
    const maxK = k || 7
    const steps: SimulationStep[] = []

    steps.push({
      stepIndex: 0,
      description: `Initialize L = 0, R = 0. Max sum constraint ≤ ${maxK}.`,
      array: nums,
      leftPointer: 0,
      rightPointer: 0,
      windowRange: [0, 0],
      activeCodeLine: 0,
      variables: { L: 0, R: 0, currentSum: 0, maxLen: 0, K: maxK }
    })

    for (let R = 0; R < N; R++) {
      currentSum += nums[R]
      steps.push({
        stepIndex: steps.length,
        description: `Expand R to ${R} (val ${nums[R]}): Window sum = ${currentSum}.`,
        array: nums,
        leftPointer: L,
        rightPointer: R,
        windowRange: [L, R],
        highlightIndices: Array.from({ length: R - L + 1 }, (_, idx) => L + idx),
        activeCodeLine: 2,
        variables: { L, R, currentSum, maxLen, K: maxK }
      })

      while (currentSum > maxK && L <= R) {
        steps.push({
          stepIndex: steps.length,
          description: `Sum ${currentSum} > ${maxK} (INVALID!). Shrink L: subtract nums[${L}] = ${nums[L]}.`,
          array: nums,
          leftPointer: L + 1,
          rightPointer: R,
          windowRange: [L + 1, R],
          activeCodeLine: 4,
          variables: { L: L + 1, R, currentSum: currentSum - nums[L], maxLen }
        })
        currentSum -= nums[L]
        L++
      }

      maxLen = Math.max(maxLen, R - L + 1)
      steps.push({
        stepIndex: steps.length,
        description: `Valid window [${L}..${R}]. Max length updated to ${maxLen}.`,
        array: nums,
        leftPointer: L,
        rightPointer: R,
        windowRange: [L, R],
        highlightIndices: Array.from({ length: R - L + 1 }, (_, idx) => L + idx),
        activeCodeLine: 6,
        variables: { L, R, currentSum, maxLen }
      })
    }

    return {
      type: "array",
      title: "Sliding Window Dynamic Boundary",
      subtitle: `Max length contiguous subarray with sum ≤ ${maxK} in [${nums.join(", ")}].`,
      code: [
        "L = 0, sum = 0, max_len = 0",
        "for R in range(len(nums)):",
        "    sum += nums[R]",
        "    while sum > K:",
        "        sum -= nums[L]",
        "        L += 1",
        "    max_len = max(max_len, R - L + 1)"
      ],
      steps
    }
  }

  // 4. Fast & Slow Pointers (LINKED LIST VISUALIZER)
  if (patternId === "fast-slow-pointers") {
    const listNodes = nums.slice(0, 6)
    let slow = 0
    let fast = 0
    const steps: SimulationStep[] = []
    const hasCycle = config.hasCycle

    steps.push({
      stepIndex: 0,
      description: "Initialize Slow pointer 🐢 @ Node 0, Fast pointer 🐇 @ Node 0.",
      array: listNodes,
      leftPointer: slow,
      rightPointer: fast,
      activeCodeLine: 0,
      linkedListCycle: hasCycle,
      variables: { slowNode: listNodes[slow], fastNode: listNodes[fast], cycleEnabled: String(hasCycle) }
    })

    const maxSteps = hasCycle ? 8 : listNodes.length
    let stepCount = 0

    while (stepCount < maxSteps) {
      stepCount++
      slow = (slow + 1) % listNodes.length
      if (hasCycle) {
        fast = (fast + 2) % listNodes.length
      } else {
        fast += 2
      }

      if (!hasCycle && fast >= listNodes.length) {
        steps.push({
          stepIndex: steps.length,
          description: `Fast reached end of Linked List (NULL). No cycle present! Middle Node = ${listNodes[slow]}.`,
          array: listNodes,
          leftPointer: slow,
          rightPointer: Math.min(fast, listNodes.length - 1),
          activeCodeLine: 5,
          linkedListCycle: false,
          variables: { result: "NO_CYCLE", middleNode: listNodes[slow] }
        })
        break
      }

      steps.push({
        stepIndex: steps.length,
        description: `Slow moves 1 step ──► Node index ${slow} (${listNodes[slow]}). Fast moves 2 steps ──► Node index ${fast} (${listNodes[fast]}).`,
        array: listNodes,
        leftPointer: slow,
        rightPointer: fast,
        activeCodeLine: 2,
        linkedListCycle: hasCycle,
        variables: { slowIdx: slow, fastIdx: fast, slowVal: listNodes[slow], fastVal: listNodes[fast] }
      })

      if (slow === fast) {
        steps.push({
          stepIndex: steps.length,
          description: `COLLISION DETECTED! Slow 🐢 and Fast 🐇 met at Node index ${slow} (${listNodes[slow]})! Cycle confirmed!`,
          array: listNodes,
          leftPointer: slow,
          rightPointer: fast,
          activeCodeLine: 4,
          linkedListCycle: true,
          variables: { result: "CYCLE_DETECTED", collisionNode: listNodes[slow] }
        })
        break
      }
    }

    return {
      type: "linked-list",
      title: "Fast & Slow Pointers (Floyd's Cycle)",
      subtitle: "Detect loops or find middle node using 1x and 2x speed pointers.",
      code: [
        "slow = head, fast = head",
        "while fast and fast.next:",
        "    slow = slow.next",
        "    fast = fast.next.next",
        "    if slow == fast: return True # Cycle Found",
        "return False # No Cycle"
      ],
      steps
    }
  }

  // 5. Monotonic Stack
  if (patternId === "monotonic-stack") {
    const stack: number[] = []
    const nge = new Array(N).fill(-1)
    const steps: SimulationStep[] = []

    steps.push({
      stepIndex: 0,
      description: "Initialize empty Monotonic Decreasing Stack.",
      array: nums,
      stack: [],
      activeCodeLine: 0,
      variables: { stack: "[]", NGE: `[${nge.join(", ")}]` }
    })

    for (let i = 0; i < N; i++) {
      while (stack.length > 0 && nums[i] > nums[stack[stack.length - 1]]) {
        const poppedIdx = stack.pop()!
        nge[poppedIdx] = nums[i]
        steps.push({
          stepIndex: steps.length,
          description: `nums[${i}] = ${nums[i]} > nums[${poppedIdx}] = ${nums[poppedIdx]}! Pop index ${poppedIdx}. NGE[${poppedIdx}] = ${nums[i]}.`,
          array: nums,
          stack: [...stack],
          highlightIndices: [poppedIdx, i],
          activeCodeLine: 3,
          variables: { poppedIndex: poppedIdx, ngeValue: nums[i], stack: `[${stack.map((idx) => nums[idx]).join(", ")}]` }
        })
      }

      stack.push(i)
      steps.push({
        stepIndex: steps.length,
        description: `Push index ${i} (value ${nums[i]}) onto monotonic stack.`,
        array: nums,
        stack: [...stack],
        highlightIndices: [i],
        activeCodeLine: 4,
        variables: { i, pushedValue: nums[i], stackValues: `[${stack.map((idx) => nums[idx]).join(", ")}]` }
      })
    }

    return {
      type: "stack",
      title: "Monotonic Stack (Next Greater Element)",
      subtitle: `Find Next Greater Element for [${nums.join(", ")}].`,
      code: [
        "stack = [] # stores indices",
        "for i in range(len(nums)):",
        "    while stack and nums[i] > nums[stack[-1]]:",
        "        NGE[stack.pop()] = nums[i]",
        "    stack.append(i)"
      ],
      steps
    }
  }

  // 6. Difference Array
  if (patternId === "difference-array") {
    const D = new Array(N + 1).fill(0)
    const steps: SimulationStep[] = []

    steps.push({
      stepIndex: 0,
      description: `Initialize Difference Array D size ${N + 1} with zeros.`,
      array: D,
      activeCodeLine: 0,
      variables: { D: `[${D.join(", ")}]` }
    })

    const updateL = 1
    const updateR = Math.min(3, N - 1)
    const val = target || 5

    D[updateL] += val
    D[updateR + 1] -= val
    steps.push({
      stepIndex: 1,
      description: `Range update [${updateL}..${updateR}] += ${val}: D[${updateL}] += ${val}, D[${updateR + 1}] -= ${val} in O(1)!`,
      array: [...D],
      highlightIndices: [updateL, updateR + 1],
      activeCodeLine: 2,
      variables: { [`D[${updateL}]`]: D[updateL], [`D[${updateR + 1}]`]: D[updateR + 1] }
    })

    const restored = new Array(N).fill(0)
    let cur = 0
    for (let i = 0; i < N; i++) {
      cur += D[i]
      restored[i] = cur
      steps.push({
        stepIndex: steps.length,
        description: `Restore original array index ${i}: sum(D[0..${i}]) = ${cur}.`,
        array: [...restored],
        highlightIndices: [i],
        activeCodeLine: 4,
        variables: { index: i, restoredValue: cur }
      })
    }

    return {
      type: "array",
      title: "Difference Array Range Update",
      subtitle: `Apply Range Update [${updateL}..${updateR}] += ${val} in O(1) time.`,
      code: [
        "D[L] += val",
        "D[R + 1] -= val",
        "# Compute prefix sum to restore values",
        "cur = 0",
        "for i in range(N): cur += D[i]"
      ],
      steps
    }
  }

  // 7. Binary Search on Search Space
  if (patternId === "binary-search-range") {
    let low = 1
    let high = 100
    const targetVal = target || 42
    const steps: SimulationStep[] = []

    steps.push({
      stepIndex: 0,
      description: `Initial Search Space: Low = ${low}, High = ${high}. Target threshold = ${targetVal}.`,
      array: [low, 25, 50, 75, high],
      leftPointer: 0,
      rightPointer: 4,
      activeCodeLine: 0,
      variables: { low, high, target: targetVal }
    })

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      if (mid === targetVal) {
        steps.push({
          stepIndex: steps.length,
          description: `Mid = ${mid} == Target ${targetVal}! Optimal value found!`,
          array: [low, mid, high],
          leftPointer: 0,
          midPointer: 1,
          rightPointer: 2,
          activeCodeLine: 3,
          variables: { optimalAns: mid }
        })
        break
      } else if (mid < targetVal) {
        steps.push({
          stepIndex: steps.length,
          description: `Mid = ${mid} < Target ${targetVal}. Condition fails! Shift Low to ${mid + 1}.`,
          array: [low, mid, high],
          leftPointer: 0,
          midPointer: 1,
          rightPointer: 2,
          activeCodeLine: 4,
          variables: { low: mid + 1, high, mid }
        })
        low = mid + 1
      } else {
        steps.push({
          stepIndex: steps.length,
          description: `Mid = ${mid} > Target ${targetVal}. Condition holds! Shift High to ${mid - 1}.`,
          array: [low, mid, high],
          leftPointer: 0,
          midPointer: 1,
          rightPointer: 2,
          activeCodeLine: 5,
          variables: { low, high: mid - 1, mid }
        })
        high = mid - 1
      }
    }

    return {
      type: "array",
      title: "Binary Search on Search Space",
      subtitle: `Find target ${targetVal} in range [1..100] in O(log N) steps.`,
      code: [
        "Low = min_val, High = max_val",
        "while Low <= High:",
        "    Mid = Low + (High - Low) // 2",
        "    if isPossible(Mid): High = Mid - 1",
        "    else: Low = Mid + 1"
      ],
      steps
    }
  }

  // 8. Top K Elements
  if (patternId === "top-k-elements") {
    const K = k || 3
    const heap: number[] = []
    const steps: SimulationStep[] = []

    steps.push({
      stepIndex: 0,
      description: `Initialize empty Min-Heap of max size K=${K}.`,
      array: nums,
      stack: [],
      activeCodeLine: 0,
      variables: { heap: "[]", K }
    })

    for (let i = 0; i < N; i++) {
      heap.push(nums[i])
      heap.sort((a, b) => a - b)
      steps.push({
        stepIndex: steps.length,
        description: `Push ${nums[i]} into Min-Heap. Heap size = ${heap.length}.`,
        array: nums,
        stack: [...heap],
        highlightIndices: [i],
        activeCodeLine: 2,
        variables: { pushed: nums[i], heap: `[${heap.join(", ")}]` }
      })

      if (heap.length > K) {
        const popped = heap.shift()!
        steps.push({
          stepIndex: steps.length,
          description: `Heap size ${heap.length + 1} > K(${K}). Evict smallest item ${popped}!`,
          array: nums,
          stack: [...heap],
          activeCodeLine: 3,
          variables: { evicted: popped, heap: `[${heap.join(", ")}]` }
        })
      }
    }

    return {
      type: "stack",
      title: "Top K Elements (Min-Heap)",
      subtitle: `Maintain K=${K} largest elements for [${nums.join(", ")}].`,
      code: [
        "heap = [] # Min-Heap size K",
        "for val in nums:",
        "    heap.push(val)",
        "    if len(heap) > K: heap.pop()"
      ],
      steps
    }
  }

  // 9. Overlapping Intervals (INTERVAL VISUALIZER)
  if (patternId === "overlapping-intervals") {
    const rawIntervals = [
      { start: 1, end: 3, label: "[1,3]" },
      { start: 2, end: 6, label: "[2,6]" },
      { start: 8, end: 10, label: "[8,10]" },
      { start: 15, end: 18, label: "[15,18]" }
    ]
    const steps: SimulationStep[] = []

    steps.push({
      stepIndex: 0,
      description: "Initial intervals sorted by start time.",
      intervalsState: rawIntervals.map((i) => ({ ...i, merged: false, active: false })),
      activeCodeLine: 0,
      variables: { intervals: "[[1,3], [2,6], [8,10], [15,18]]" }
    })

    steps.push({
      stepIndex: 1,
      description: "Compare [1,3] and [2,6]. Since 2 <= 3, OVERLAP DETECTED! Merge into [1,6].",
      intervalsState: [
        { start: 1, end: 6, label: "[1,6] (Merged)", merged: true, active: true },
        { start: 8, end: 10, label: "[8,10]", merged: false, active: false },
        { start: 15, end: 18, label: "[15,18]", merged: false, active: false }
      ],
      activeCodeLine: 4,
      variables: { mergedCount: 1, currentMerged: "[1,6]" }
    })

    steps.push({
      stepIndex: 2,
      description: "Compare [1,6] and [8,10]. No overlap (8 > 6). Keep separate.",
      intervalsState: [
        { start: 1, end: 6, label: "[1,6]", merged: true, active: false },
        { start: 8, end: 10, label: "[8,10]", merged: false, active: true },
        { start: 15, end: 18, label: "[15,18]", merged: false, active: false }
      ],
      activeCodeLine: 3,
      variables: { result: "[[1,6], [8,10], [15,18]]" }
    })

    return {
      type: "intervals",
      title: "Interval Merging Timeline",
      subtitle: "Sort intervals and merge overlapping time ranges in O(N log N).",
      code: [
        "intervals.sort(key=lambda x: x[0])",
        "merged = []",
        "for interval in intervals:",
        "    if not merged or merged[-1][1] < interval[0]: merged.append(interval)",
        "    else: merged[-1][1] = max(merged[-1][1], interval[1])"
      ],
      steps
    }
  }

  // 10. Cyclic Sort
  if (patternId === "cyclic-sort") {
    const arr = [3, 4, 1, 2, 5]
    const steps: SimulationStep[] = []
    let i = 0

    steps.push({
      stepIndex: 0,
      description: "Start Cyclic Sort. Iterate index i = 0.",
      array: [...arr],
      leftPointer: 0,
      activeCodeLine: 0,
      variables: { i: 0, arr: `[${arr.join(", ")}]` }
    })

    while (i < arr.length) {
      const correctIdx = arr[i] - 1
      if (arr[i] !== arr[correctIdx]) {
        const temp = arr[i]
        arr[i] = arr[correctIdx]
        arr[correctIdx] = temp
        steps.push({
          stepIndex: steps.length,
          description: `arr[${i}] = ${temp} belongs at index ${correctIdx}. Swap arr[${i}] <-> arr[${correctIdx}]!`,
          array: [...arr],
          leftPointer: i,
          rightPointer: correctIdx,
          highlightIndices: [i, correctIdx],
          activeCodeLine: 3,
          variables: { i, correctIdx, arr: `[${arr.join(", ")}]` }
        })
      } else {
        i++
        if (i < arr.length) {
          steps.push({
            stepIndex: steps.length,
            description: `arr[${i - 1}] is at correct position. Move to index ${i}.`,
            array: [...arr],
            leftPointer: i,
            activeCodeLine: 4,
            variables: { i, arr: `[${arr.join(", ")}]` }
          })
        }
      }
    }

    return {
      type: "array",
      title: "Cyclic Sort (O(N) In-Place Placement)",
      subtitle: "Swapping elements to target index nums[i]-1 in O(N) time and O(1) space.",
      code: [
        "i = 0",
        "while i < N:",
        "    correct = nums[i] - 1",
        "    if nums[i] != nums[correct]: swap(nums[i], nums[correct])",
        "    else: i += 1"
      ],
      steps
    }
  }

  // 11. Tree BFS Level Order (REAL SVG TREE VISUALIZER)
  if (patternId === "bfs-dfs-trees") {
    const steps: SimulationStep[] = [
      {
        stepIndex: 0,
        description: "Initialize Queue with Root Node (1). Level 1 exploration.",
        activeNodeId: 1,
        visitedNodeIds: [],
        queueState: [1],
        activeCodeLine: 0,
        variables: { queue: "[1]", currentLevel: 1 }
      },
      {
        stepIndex: 1,
        description: "Pop Node 1. Visit children 2 (Left) & 3 (Right). Push [2, 3] into Queue.",
        activeNodeId: 1,
        visitedNodeIds: [1],
        queueState: [2, 3],
        activeCodeLine: 2,
        variables: { popped: 1, queue: "[2, 3]", currentLevel: 2 }
      },
      {
        stepIndex: 2,
        description: "Pop Node 2. Visit children 4 & 5. Queue becomes [3, 4, 5].",
        activeNodeId: 2,
        visitedNodeIds: [1, 2],
        queueState: [3, 4, 5],
        activeCodeLine: 4,
        variables: { popped: 2, queue: "[3, 4, 5]", currentLevel: 2 }
      },
      {
        stepIndex: 3,
        description: "Pop Node 3. Visit children 6 & 7. Queue becomes [4, 5, 6, 7]. Level 2 complete!",
        activeNodeId: 3,
        visitedNodeIds: [1, 2, 3],
        queueState: [4, 5, 6, 7],
        activeCodeLine: 5,
        variables: { popped: 3, queue: "[4, 5, 6, 7]", currentLevel: 3 }
      }
    ]

    return {
      type: "tree",
      title: "Binary Tree BFS Level-Order Traversal",
      subtitle: "Process tree nodes level by level using Queue snapshot.",
      code: [
        "queue = [root]",
        "while queue:",
        "    level_sz = len(queue)",
        "    for _ in range(level_sz):",
        "        node = queue.pop(0)",
        "        if node.left: queue.append(node.left)",
        "        if node.right: queue.append(node.right)"
      ],
      steps
    }
  }

  // 12. Matrix Grid Flood Fill (REAL 2D GRID VISUALIZER)
  if (patternId === "matrix-traversal") {
    const grid = config.gridMatrix && config.gridMatrix.length > 0 ? config.gridMatrix : [
      [1, 1, 0],
      [0, 1, 0],
      [1, 0, 1]
    ]

    const steps: SimulationStep[] = [
      {
        stepIndex: 0,
        description: "Scan 3x3 Grid. Cell (0,0) is Land '1'. Start Island 1 DFS.",
        gridState: grid,
        activeGridCell: [0, 0],
        visitedGridCells: [],
        activeCodeLine: 0,
        variables: { islandCount: 1, currentCell: "(0,0)" }
      },
      {
        stepIndex: 1,
        description: "Flood Fill DFS: Visit adjacent land cell (0,1). Mark visited (0,0) -> 0.",
        gridState: [
          [0, 1, 0],
          [0, 1, 0],
          [1, 0, 1]
        ],
        activeGridCell: [0, 1],
        visitedGridCells: ["0,0"],
        activeCodeLine: 2,
        variables: { islandCount: 1, currentCell: "(0,1)" }
      },
      {
        stepIndex: 2,
        description: "Flood Fill DFS: Visit adjacent land cell (1,1). Mark visited (0,1) -> 0.",
        gridState: [
          [0, 0, 0],
          [0, 1, 0],
          [1, 0, 1]
        ],
        activeGridCell: [1, 1],
        visitedGridCells: ["0,0", "0,1"],
        activeCodeLine: 3,
        variables: { islandCount: 1, currentCell: "(1,1)" }
      },
      {
        stepIndex: 3,
        description: "Island 1 DFS complete! Scan grid. Next unvisited land @ (2,0). Start Island 2 DFS.",
        gridState: [
          [0, 0, 0],
          [0, 0, 0],
          [1, 0, 1]
        ],
        activeGridCell: [2, 0],
        visitedGridCells: ["0,0", "0,1", "1,1"],
        activeCodeLine: 4,
        variables: { totalIslands: 2, status: "COMPLETE" }
      }
    ]

    return {
      type: "grid",
      title: "2D Matrix Grid Flood Fill (DFS/BFS)",
      subtitle: "Counting 4-directionally connected land components by mutating grid.",
      code: [
        "for r in range(R):",
        "    for c in range(C):",
        "        if grid[r][c] == '1':",
        "            islands += 1",
        "            dfs(r, c)"
      ],
      steps
    }
  }

  // 13. Disjoint Set Union (REAL GRAPH VISUALIZER)
  if (patternId === "union-find") {
    const steps: SimulationStep[] = [
      {
        stepIndex: 0,
        description: "Initialize DSU parent array: parent[i] = i for all 5 nodes.",
        dsuParents: [0, 1, 2, 3, 4],
        activeCodeLine: 0,
        variables: { parent: "[0, 1, 2, 3, 4]" }
      },
      {
        stepIndex: 1,
        description: "union(0, 1): Set parent[1] = 0. Connected set {0, 1}.",
        dsuParents: [0, 0, 2, 3, 4],
        activeCodeLine: 2,
        variables: { parent: "[0, 0, 2, 3, 4]", edgeAdded: "0 - 1" }
      },
      {
        stepIndex: 2,
        description: "union(1, 2): Find(1) = 0. Set parent[2] = 0. Connected set {0, 1, 2}.",
        dsuParents: [0, 0, 0, 3, 4],
        activeCodeLine: 3,
        variables: { parent: "[0, 0, 0, 3, 4]", edgeAdded: "1 - 2" }
      }
    ]

    return {
      type: "graph",
      title: "Disjoint Set Union (DSU Graph)",
      subtitle: "Dynamic connectivity queries with path compression in O(α(N)).",
      code: [
        "parent = [0..N-1]",
        "def find(i):",
        "    if parent[i] != i: parent[i] = find(parent[i])",
        "    return parent[i]",
        "def union(i, j): parent[find(i)] = find(j)"
      ],
      steps
    }
  }

  // 14. Topological Sort (REAL DAG GRAPH VISUALIZER)
  if (patternId === "topological-sort") {
    const steps: SimulationStep[] = [
      {
        stepIndex: 0,
        description: "Compute in-degrees: Node 0 (deg:0), Node 1 (deg:1), Node 2 (deg:1), Node 3 (deg:2). Queue = [0].",
        inDegrees: [0, 1, 1, 2],
        topoQueue: [0],
        topoResult: [],
        activeCodeLine: 0,
        variables: { inDegrees: "[0, 1, 1, 2]", queue: "[0]" }
      },
      {
        stepIndex: 1,
        description: "Pop Node 0. Decrement neighbors 1 & 2 in-degrees to 0. Push [1, 2] to Queue.",
        inDegrees: [0, 0, 0, 2],
        topoQueue: [1, 2],
        topoResult: [0],
        activeCodeLine: 2,
        variables: { popped: 0, queue: "[1, 2]", order: "[0]" }
      },
      {
        stepIndex: 2,
        description: "Pop Nodes 1 & 2. Decrement neighbor 3 in-degree to 0. Topological Order = [0, 1, 2, 3]!",
        inDegrees: [0, 0, 0, 0],
        topoQueue: [3],
        topoResult: [0, 1, 2, 3],
        activeCodeLine: 4,
        variables: { topoResult: "[0, 1, 2, 3]", status: "SUCCESS" }
      }
    ]

    return {
      type: "graph",
      title: "Topological Sort (Kahn's DAG Algorithm)",
      subtitle: "Ordering DAG tasks with prerequisites using in-degree Queue.",
      code: [
        "in_degree = compute_indegrees()",
        "queue = [nodes where in_degree == 0]",
        "while queue:",
        "    u = queue.pop(0)",
        "    for v in adj[u]:",
        "        in_degree[v] -= 1",
        "        if in_degree[v] == 0: queue.append(v)"
      ],
      steps
    }
  }

  // 15. 0/1 Knapsack DP (DP TABLE VISUALIZER)
  if (patternId === "knapsack-dp") {
    const W = k || 5
    const steps: SimulationStep[] = [
      {
        stepIndex: 0,
        description: `Initialize 1D DP table size W+1=${W + 1} with zeros for capacities 0..${W}.`,
        dpTable: [0, 0, 0, 0, 0, 0],
        activeCodeLine: 0,
        variables: { capacity: W, dp: "[0, 0, 0, 0, 0, 0]" }
      },
      {
        stepIndex: 1,
        description: "Process Item 1 (Wt:2, Val:3): Reverse loop capacities 5 down to 2. dp[2..5] = 3.",
        dpTable: [0, 0, 3, 3, 3, 3],
        activeCodeLine: 2,
        variables: { item: "Wt:2 Val:3", dp: "[0, 0, 3, 3, 3, 3]" }
      },
      {
        stepIndex: 2,
        description: "Process Item 2 (Wt:3, Val:4): dp[5] = max(3, 4 + dp[2]) = 7!",
        dpTable: [0, 0, 3, 4, 4, 7],
        activeCodeLine: 3,
        variables: { maxOptimalVal: 7, dp: "[0, 0, 3, 4, 4, 7]" }
      }
    ]

    return {
      type: "dp-table",
      title: "0/1 Knapsack Dynamic Programming",
      subtitle: "Optimal subset selection under capacity constraint W.",
      code: [
        "dp = [0] * (W + 1)",
        "for wt, val in items:",
        "    for w in range(W, wt - 1, -1):",
        "        dp[w] = max(dp[w], val + dp[w - wt])"
      ],
      steps
    }
  }

  // 16. Segment Tree (REAL TREE VISUALIZER)
  if (patternId === "segment-tree") {
    const steps: SimulationStep[] = [
      {
        stepIndex: 0,
        description: "Segment Tree built over array [1, 3, 5, 7]. Root node stores range sum [0..3] = 16.",
        activeNodeId: 1,
        queueState: [16, 4, 12, 1, 3, 5, 7],
        activeCodeLine: 0,
        variables: { rootSum: 16, range: "[0..3]" }
      },
      {
        stepIndex: 1,
        description: "Point Update A[1] = 10: Update leaf node [1] from 3 to 10. Recalculate parents up to root = 23.",
        activeNodeId: 1,
        queueState: [23, 11, 12, 1, 10, 5, 7],
        activeCodeLine: 2,
        variables: { updatedRootSum: 23 }
      }
    ]

    return {
      type: "tree",
      title: "Segment Tree Dynamic Range Queries",
      subtitle: "Point updates and range queries in O(log N) time.",
      code: [
        "def update(idx, val, node, start, end):",
        "    if start == end: tree[node] = val; return",
        "    mid = (start + end) // 2",
        "    if idx <= mid: update(idx, val, 2*node, start, mid)",
        "    else: update(idx, val, 2*node+1, mid+1, end)",
        "    tree[node] = tree[2*node] + tree[2*node+1]"
      ],
      steps
    }
  }

  // Fallback default
  return generateDynamicSimulation("sliding-window", config)
}

export function hasSimulation(_patternId: string): boolean {
  return true
}

export function PatternSimulator({ patternId }: { patternId: string }) {
  const [customInputText, setCustomInputText] = useState("3, 1, 4, 2, 5")
  const [targetVal, setTargetVal] = useState<number>(10)
  const [kVal, setKVal] = useState<number>(7)
  const [hasCycle, setHasCycle] = useState<boolean>(true)
  const [gridMatrix, setGridMatrix] = useState<number[][]>([
    [1, 1, 0],
    [0, 1, 0],
    [1, 0, 1]
  ])

  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState<1000 | 1800 | 2500>(1800)

  useEffect(() => {
    if (patternId === "two-pointers") {
      setCustomInputText("1, 3, 4, 6, 8, 11")
      setTargetVal(10)
    } else if (patternId === "sliding-window") {
      setCustomInputText("2, 1, 5, 1, 3, 2")
      setKVal(7)
    } else if (patternId === "fast-slow-pointers") {
      setCustomInputText("1, 2, 3, 4, 5, 6")
      setHasCycle(true)
    } else if (patternId === "top-k-elements") {
      setCustomInputText("3, 1, 5, 12, 2, 11")
      setKVal(3)
    } else {
      setCustomInputText("3, 1, 4, 2, 5")
    }
    setCurrentStep(0)
    setIsPlaying(false)
  }, [patternId])

  const parsedInput = customInputText
    .split(",")
    .map((s) => parseInt(s.trim()))
    .filter((n) => !isNaN(n))

  const simData = generateDynamicSimulation(patternId, {
    inputArray: parsedInput.length > 0 ? parsedInput : [3, 1, 4, 2, 5],
    targetVal,
    kVal,
    hasCycle,
    gridMatrix
  })

  const step = simData.steps[currentStep] || simData.steps[0]

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setTimeout(() => {
        setCurrentStep((prev) => {
          if (prev >= simData.steps.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, speed)
    }
    return () => clearTimeout(timer)
  }, [isPlaying, currentStep, speed, simData.steps.length])

  // Cell click toggle for Matrix Grid
  const toggleGridCell = (r: number, c: number) => {
    const copy = gridMatrix.map((row) => [...row])
    copy[r][c] = copy[r][c] === 1 ? 0 : 1
    setGridMatrix(copy)
    setCurrentStep(0)
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#282828] p-4 font-sans text-zinc-100 space-y-4">
      {/* Top Header & Editable Parameters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#00b8a3]" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#ffa116]">
              Interactive Pattern VisuAlgo Simulator
            </span>
          </div>
          <h3 className="text-sm font-bold text-zinc-100 mt-0.5">{simData.title}</h3>
          <p className="text-[11px] text-zinc-400">{simData.subtitle}</p>
        </div>

        {/* Dynamic Parameter Inputs Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Array Input */}
          {simData.type !== "grid" && simData.type !== "tree" && (
            <div className="flex items-center gap-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-2.5 py-1.5 font-mono text-xs">
              <Edit3 size={12} className="text-[#ffa116]" />
              <span className="text-zinc-500 text-[10px] uppercase font-bold">Array:</span>
              <input
                type="text"
                value={customInputText}
                onChange={(e) => {
                  setCustomInputText(e.target.value)
                  setCurrentStep(0)
                }}
                className="bg-transparent border-none text-[#ffa116] font-bold focus:outline-none w-28 text-xs"
                placeholder="e.g. 3, 1, 4, 2, 5"
              />
            </div>
          )}

          {/* Target / K Input */}
          {(patternId === "two-pointers" || patternId === "binary-search-range" || patternId === "difference-array") && (
            <div className="flex items-center gap-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-2.5 py-1.5 font-mono text-xs">
              <span className="text-zinc-500 text-[10px] uppercase font-bold">Target:</span>
              <input
                type="number"
                value={targetVal}
                onChange={(e) => {
                  setTargetVal(parseInt(e.target.value) || 0)
                  setCurrentStep(0)
                }}
                className="bg-transparent border-none text-[#00b8a3] font-bold focus:outline-none w-12 text-xs"
              />
            </div>
          )}

          {(patternId === "sliding-window" || patternId === "top-k-elements" || patternId === "knapsack-dp") && (
            <div className="flex items-center gap-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-2.5 py-1.5 font-mono text-xs">
              <span className="text-zinc-500 text-[10px] uppercase font-bold">K / Limit:</span>
              <input
                type="number"
                value={kVal}
                onChange={(e) => {
                  setKVal(parseInt(e.target.value) || 1)
                  setCurrentStep(0)
                }}
                className="bg-transparent border-none text-[#ffc01e] font-bold focus:outline-none w-12 text-xs"
              />
            </div>
          )}

          {/* Cycle Toggle for Linked List */}
          {patternId === "fast-slow-pointers" && (
            <button
              onClick={() => {
                setHasCycle(!hasCycle)
                setCurrentStep(0)
              }}
              className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 font-mono text-[10px] font-bold transition-all cursor-pointer ${
                hasCycle
                  ? "border-[#00b8a3]/40 bg-[#00b8a3]/10 text-[#00b8a3]"
                  : "border-white/[0.08] bg-[#1a1a1a] text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Repeat size={12} />
              Cycle: {hasCycle ? "ON" : "OFF"}
            </button>
          )}

          {/* Grid Presets */}
          {simData.type === "grid" && (
            <div className="flex items-center gap-1 font-mono text-[10px]">
              <span className="text-zinc-500 font-bold uppercase mr-1">Grid Preset:</span>
              <button
                onClick={() => { setGridMatrix([[1, 1, 0], [0, 1, 0], [1, 0, 1]]); setCurrentStep(0); }}
                className="px-2 py-1 rounded border border-white/[0.08] bg-[#1a1a1a] text-zinc-300 hover:text-[#00b8a3]"
              >
                Multi-Island
              </button>
              <button
                onClick={() => { setGridMatrix([[1, 1, 1], [1, 1, 1], [1, 1, 1]]); setCurrentStep(0); }}
                className="px-2 py-1 rounded border border-white/[0.08] bg-[#1a1a1a] text-zinc-300 hover:text-[#00b8a3]"
              >
                All Land
              </button>
              <button
                onClick={() => { setGridMatrix([[1, 0, 1], [0, 1, 0], [1, 0, 1]]); setCurrentStep(0); }}
                className="px-2 py-1 rounded border border-white/[0.08] bg-[#1a1a1a] text-zinc-300 hover:text-[#00b8a3]"
              >
                Cross
              </button>
            </div>
          )}

          {/* Quick Array Presets */}
          {simData.type !== "grid" && simData.type !== "tree" && (
            <div className="flex items-center gap-1 font-mono text-[9.5px]">
              <button
                onClick={() => {
                  const presets = ["3, 1, 4, 2, 5", "1, 3, 6, 8, 12", "5, 2, 9, 1, 7"]
                  const chosen = presets[(presets.indexOf(customInputText) + 1) % presets.length]
                  setCustomInputText(chosen)
                  setCurrentStep(0)
                }}
                className="px-2 py-1 rounded border border-white/[0.08] bg-[#1a1a1a] text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                🔀 Sample Data
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Control Buttons & Speed Controls */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-2.5">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 rounded-lg bg-[#ffa116] hover:bg-[#ffa116]/90 px-3 py-1.5 text-[11px] font-bold text-zinc-950 transition-colors shadow-sm"
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="rounded-lg border border-white/[0.08] bg-[#282828] p-1.5 text-zinc-300 hover:bg-[#333333] disabled:opacity-30"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => setCurrentStep((prev) => Math.min(simData.steps.length - 1, prev + 1))}
            disabled={currentStep === simData.steps.length - 1}
            className="rounded-lg border border-white/[0.08] bg-[#282828] p-1.5 text-zinc-300 hover:bg-[#333333] disabled:opacity-30"
          >
            <ChevronRight size={15} />
          </button>
          <button
            onClick={() => {
              setCurrentStep(0)
              setIsPlaying(false)
            }}
            className="rounded-lg border border-white/[0.08] bg-[#282828] p-1.5 text-zinc-400 hover:bg-[#333333] hover:text-zinc-200"
            title="Reset Simulation"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Step Badge & Speed Selector */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-white/[0.08] bg-[#282828] px-2.5 py-1 text-right font-mono text-xs">
            <span className="font-bold text-[#ffa116]">Step {currentStep + 1}</span>
            <span className="text-zinc-500"> / {simData.steps.length}</span>
          </div>

          <div className="flex items-center gap-1 text-[9.5px] font-mono font-bold text-zinc-400">
            {([2500, 1800, 1000] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-0.5 rounded border transition-all ${
                  speed === s
                    ? "border-[#ffa116]/40 bg-[#ffa116]/15 text-[#ffa116]"
                    : "border-white/[0.08] bg-[#282828] text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {s === 2500 ? "0.5x" : s === 1800 ? "1x" : "2x"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          DYNAMIC VISUAL ARENA (CUSTOM VISUALIZERS FOR ALL PATTERNS)
         ───────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/10 bg-[#1a1a1c] p-5 min-h-[190px] flex flex-col justify-center items-center relative overflow-hidden shadow-inner">
        
        {/* 1. LINKED LIST VISUALIZER */}
        {simData.type === "linked-list" && step.array && (
          <div className="w-full flex flex-col items-center justify-center py-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-4 max-w-full">
              {step.array.map((val, idx) => {
                const isSlow = step.leftPointer === idx
                const isFast = step.rightPointer === idx
                const isCollision = isSlow && isFast && step.stepIndex > 0

                return (
                  <React.Fragment key={idx}>
                    <div className="flex flex-col items-center relative">
                      {/* Pointer Badges */}
                      <div className="h-6 flex items-center gap-1 font-mono text-[9px] font-extrabold mb-1">
                        {isSlow && (
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                            Slow 🐢
                          </span>
                        )}
                        {isFast && (
                          <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.5 rounded">
                            Fast 🐇
                          </span>
                        )}
                      </div>

                      {/* Node Circle */}
                      <motion.div
                        layout
                        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-mono font-bold text-sm transition-all duration-300 shadow-md ${
                          isCollision
                            ? "bg-[#ef4743]/20 border-[#ef4743] text-[#ef4743] scale-110"
                            : isSlow || isFast
                            ? "bg-[#ffa116]/20 border-[#ffa116] text-[#ffa116] scale-105"
                            : "bg-zinc-900 border-zinc-700 text-zinc-300"
                        }`}
                      >
                        {val}
                      </motion.div>
                      <span className="text-[9px] font-mono text-zinc-500 mt-1">[{idx}]</span>
                    </div>

                    {/* Arrow Connection */}
                    {idx < (step.array?.length ?? 0) - 1 && (
                      <div className="flex items-center text-zinc-600 font-mono text-lg font-bold">
                        →
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>

            {/* Cycle Curve Line Indicator */}
            {hasCycle && (
              <div className="mt-1 flex items-center gap-2 border border-[#00b8a3]/30 bg-[#00b8a3]/[0.06] px-3 py-1 rounded-full text-[10px] font-mono text-[#00b8a3]">
                <Repeat size={12} /> Loopback: Tail (Node [{step.array.length - 1}]) connects back to Node [2]
              </div>
            )}
          </div>
        )}

        {/* 2. REAL SVG BINARY TREE VISUALIZER */}
        {simData.type === "tree" && (
          <div className="w-full flex flex-col items-center justify-center relative py-2">
            <svg className="w-full h-44 max-w-md overflow-visible" viewBox="0 0 400 180">
              {/* Edges */}
              <line x1="200" y1="35" x2="100" y2="85" stroke="#3f3f46" strokeWidth="2" />
              <line x1="200" y1="35" x2="300" y2="85" stroke="#3f3f46" strokeWidth="2" />
              <line x1="100" y1="85" x2="50" y2="145" stroke="#3f3f46" strokeWidth="2" />
              <line x1="100" y1="85" x2="150" y2="145" stroke="#3f3f46" strokeWidth="2" />
              <line x1="300" y1="85" x2="250" y2="145" stroke="#3f3f46" strokeWidth="2" />
              <line x1="300" y1="85" x2="350" y2="145" stroke="#3f3f46" strokeWidth="2" />

              {/* Tree Nodes */}
              {[
                { id: 1, val: 1, x: 200, y: 35 },
                { id: 2, val: 2, x: 100, y: 85 },
                { id: 3, val: 3, x: 300, y: 85 },
                { id: 4, val: 4, x: 50, y: 145 },
                { id: 5, val: 5, x: 150, y: 145 },
                { id: 6, val: 6, x: 250, y: 145 },
                { id: 7, val: 7, x: 350, y: 145 }
              ].map((n) => {
                const isActive = step.activeNodeId === n.id
                const isVisited = step.visitedNodeIds?.includes(n.id)

                let fill = "#18181b"
                let stroke = "#3f3f46"
                let textCol = "#a1a1aa"

                if (isActive) {
                  fill = "#ffa116"
                  stroke = "#ffa116"
                  textCol = "#1a1a1a"
                } else if (isVisited) {
                  fill = "#064e3b"
                  stroke = "#00b8a3"
                  textCol = "#00b8a3"
                }

                return (
                  <g key={n.id}>
                    <circle cx={n.x} cy={n.y} r="18" fill={fill} stroke={stroke} strokeWidth="2.5" />
                    <text
                      x={n.x}
                      y={n.y + 4}
                      textAnchor="middle"
                      fill={textCol}
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {n.val}
                    </text>
                  </g>
                )
              })}
            </svg>

            {/* BFS Queue Snapshot Buffer */}
            {step.queueState && (
              <div className="mt-2 flex items-center gap-2 border border-white/[0.08] bg-[#1a1a1a] px-3 py-1 rounded-xl font-mono text-xs">
                <GitBranch size={13} className="text-[#ffa116]" />
                <span className="text-zinc-500 font-bold uppercase text-[10px]">BFS Queue:</span>
                <span className="text-[#ffa116] font-bold">[{step.queueState.join(", ")}]</span>
              </div>
            )}
          </div>
        )}

        {/* 3. REAL SVG GRAPH & DAG VISUALIZER */}
        {simData.type === "graph" && (
          <div className="w-full flex flex-col items-center justify-center relative py-2">
            <svg className="w-full h-44 max-w-md overflow-visible" viewBox="0 0 400 180">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#71717a" />
                </marker>
              </defs>

              {/* Directed Edges */}
              <path d="M 70 90 L 170 40" stroke="#52525b" strokeWidth="2" markerEnd="url(#arrow)" />
              <path d="M 70 90 L 170 140" stroke="#52525b" strokeWidth="2" markerEnd="url(#arrow)" />
              <path d="M 190 40 L 290 90" stroke="#52525b" strokeWidth="2" markerEnd="url(#arrow)" />
              <path d="M 190 140 L 290 90" stroke="#52525b" strokeWidth="2" markerEnd="url(#arrow)" />

              {/* Graph Nodes */}
              {[
                { id: 0, label: "Node 0", x: 60, y: 90 },
                { id: 1, label: "Node 1", x: 180, y: 40 },
                { id: 2, label: "Node 2", x: 180, y: 140 },
                { id: 3, label: "Node 3", x: 300, y: 90 }
              ].map((gn) => {
                const inDeg = step.inDegrees ? step.inDegrees[gn.id] : 0
                const isPopped = step.topoResult?.includes(gn.id)
                const inQueue = step.topoQueue?.includes(gn.id)

                let fill = "#18181b"
                let stroke = "#3f3f46"
                let textCol = "#a1a1aa"

                if (isPopped) {
                  fill = "#064e3b"
                  stroke = "#10b981"
                  textCol = "#6ee7b7"
                } else if (inQueue) {
                  fill = "#78350f"
                  stroke = "#f59e0b"
                  textCol = "#fef08a"
                }

                return (
                  <g key={gn.id}>
                    <circle cx={gn.x} cy={gn.y} r="20" fill={fill} stroke={stroke} strokeWidth="2.5" />
                    <text x={gn.x} y={gn.y + 4} textAnchor="middle" fill={textCol} fontSize="12" fontWeight="bold" fontFamily="monospace">
                      {gn.id}
                    </text>
                    {/* In-Degree Badge */}
                    <rect x={gn.x - 14} y={gn.y - 32} width="28" height="12" rx="3" fill="#09090b" stroke="#3f3f46" />
                    <text x={gn.x} y={gn.y - 23} textAnchor="middle" fill="#d4d4d8" fontSize="8" fontFamily="monospace" fontWeight="bold">
                      deg:{inDeg}
                    </text>
                  </g>
                )
              })}
            </svg>

            {step.topoResult && (
              <div className="mt-2 flex items-center gap-2 border border-white/[0.08] bg-[#1a1a1a] px-3 py-1 rounded-xl font-mono text-xs">
                <Network size={13} className="text-[#ffa116]" />
                <span className="text-zinc-500 font-bold uppercase text-[10px]">Topological Order:</span>
                <span className="text-[#00b8a3] font-bold">[{step.topoResult.join(", ")}]</span>
              </div>
            )}
          </div>
        )}

        {/* 4. REAL 2D MATRIX GRID VISUALIZER */}
        {simData.type === "grid" && step.gridState && (
          <div className="w-full flex flex-col items-center justify-center py-2">
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-2">
              Interactive 3x3 Grid (Click cells to toggle Land/Water)
            </span>
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl border border-white/[0.08] bg-[#1a1a1a] shadow-inner">
              {step.gridState.map((row, r) =>
                row.map((val, c) => {
                  const isActive = step.activeGridCell && step.activeGridCell[0] === r && step.activeGridCell[1] === c
                  const isVisited = step.visitedGridCells?.includes(`${r},${c}`)

                  let bgClass = "bg-zinc-900 border-zinc-800 text-zinc-600"
                  if (isActive) {
                    bgClass = "bg-[#ffa116] border-[#ffa116] text-zinc-950 scale-105"
                  } else if (val === 1) {
                    bgClass = "bg-[#00b8a3]/20 border-[#00b8a3]/50 text-[#00b8a3] hover:border-[#00b8a3]"
                  } else if (isVisited) {
                    bgClass = "bg-sky-950/50 border-sky-600/40 text-sky-400"
                  }

                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => toggleGridCell(r, c)}
                      className={`w-14 h-14 rounded-xl border flex flex-col items-center justify-center font-mono transition-all duration-300 cursor-pointer ${bgClass}`}
                    >
                      <span className="text-base font-extrabold">{val === 1 ? "🌴" : "🌊"}</span>
                      <span className="text-[8px] font-mono opacity-60">({r},{c})</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* 5. INTERVAL VISUALIZER */}
        {simData.type === "intervals" && step.intervalsState && (
          <div className="w-full flex flex-col items-center justify-center py-3">
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-3">
              Timeline Scale (Merge Overlapping Blocks)
            </span>
            <div className="w-full max-w-md space-y-2.5 bg-[#1a1a1a] p-4 rounded-xl border border-white/[0.08]">
              {step.intervalsState.map((int, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-24 text-[10px] font-mono font-bold text-zinc-400 text-right">{int.label}</span>
                  <div className="flex-1 h-7 bg-[#282828] rounded-lg relative overflow-hidden border border-white/[0.08]">
                    <motion.div
                      layout
                      style={{
                        left: `${(int.start / 20) * 100}%`,
                        width: `${((int.end - int.start) / 20) * 100}%`
                      }}
                      className={`absolute top-1 bottom-1 rounded-md transition-all flex items-center justify-center font-mono text-[9px] font-bold ${
                        int.merged
                          ? "bg-[#00b8a3] text-zinc-950 shadow-md"
                          : int.active
                          ? "bg-[#ffa116] text-zinc-950"
                          : "bg-[#ffc01e]/20 text-[#ffc01e] border border-[#ffc01e]/40"
                      }`}
                    >
                      [{int.start}..{int.end}]
                    </motion.div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. DP TABLE VISUALIZER */}
        {simData.type === "dp-table" && step.dpTable && (
          <div className="w-full flex flex-col items-center justify-center py-2">
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-2">
              1D DP Table State (Capacities 0..W)
            </span>
            <div className="flex justify-center gap-2 overflow-x-auto w-full pb-2">
              {step.dpTable.map((val, w) => (
                <div
                  key={w}
                  className="w-12 h-14 rounded-xl border border-amber-500/40 bg-amber-500/10 flex flex-col items-center justify-center font-mono text-amber-300 shadow-sm"
                >
                  <span className="text-base font-extrabold">{val}</span>
                  <span className="text-[8px] text-zinc-500 font-mono">W={w}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. STACK & MEMORY BUFFER VISUALIZER */}
        {simData.type === "stack" && step.stack && (
          <div className="flex flex-col-reverse items-center justify-end min-h-[140px] w-full gap-1 border-b-2 border-amber-400/40 pb-2">
            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest mb-1">
              Active Memory Buffer (Push ↑ / Pop ↓)
            </span>
            <AnimatePresence>
              {step.stack.length === 0 ? (
                <span className="text-xs font-mono text-zinc-600 italic">Buffer Empty</span>
              ) : (
                step.stack.map((idxVal, sIdx) => (
                  <motion.div
                    key={`${idxVal}-${sIdx}`}
                    initial={{ opacity: 0, y: -15, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.9 }}
                    className="w-52 py-1.5 rounded-lg border border-[#00b8a3]/40 bg-[#00b8a3]/15 text-[#00b8a3] font-mono text-xs font-bold text-center flex items-center justify-between px-3 shadow-md"
                  >
                    <span className="text-[10px] text-zinc-500">Item #{sIdx + 1}</span>
                    <span>Val: {idxVal}</span>
                    {sIdx === step.stack!.length - 1 && (
                      <span className="text-[9px] bg-[#ffa116] text-zinc-950 font-extrabold px-1.5 rounded">TOP</span>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        )}

        {/* 8. STANDARD ARRAY & POINTER VISUALIZER */}
        {simData.type === "array" && step.array && (
          <div className="w-full">
            {/* Pointer Indicators */}
            <div className="flex justify-center gap-3 mb-3 w-full overflow-x-auto">
              {step.array.map((_, idx) => {
                const isLeft = step.leftPointer === idx
                const isRight = step.rightPointer === idx
                const isMid = step.midPointer === idx
                return (
                  <div key={idx} className="w-12 text-center h-5 flex items-center justify-center font-mono text-[10px] font-extrabold flex-shrink-0">
                    {isLeft && isRight ? (
                      <span className="text-[#ffa116] bg-[#ffa116]/10 border border-[#ffa116]/30 px-1 rounded">L&R</span>
                    ) : isLeft ? (
                      <span className="text-[#ffa116]">L ↓</span>
                    ) : isRight ? (
                      <span className="text-sky-400">R ↓</span>
                    ) : isMid ? (
                      <span className="text-purple-400">MID ↓</span>
                    ) : null}
                  </div>
                )
              })}
            </div>

            {/* Array Cells */}
            <div className="flex justify-center gap-3 w-full overflow-x-auto pb-2">
              {step.array.map((val, idx) => {
                const inWindow =
                  step.windowRange && idx >= step.windowRange[0] && idx <= step.windowRange[1]
                const isHighlighted = step.highlightIndices?.includes(idx)

                let bgClass = "bg-zinc-900/80 border-zinc-800 text-zinc-300"
                if (isHighlighted) {
                  bgClass = "bg-[#00b8a3]/20 border-[#00b8a3] text-[#00b8a3] scale-105"
                } else if (inWindow) {
                  bgClass = "bg-[#ffa116]/15 border-[#ffa116]/50 text-[#ffa116]"
                }

                return (
                  <motion.div
                    key={idx}
                    layout
                    className={`w-12 h-14 rounded-xl border flex flex-col items-center justify-center font-mono transition-all duration-300 flex-shrink-0 ${bgClass}`}
                  >
                    <span className="text-base font-bold">{val}</span>
                    <span className="text-[8px] text-zinc-500 font-mono mt-0.5">[{idx}]</span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

      </div>

      {/* Action Log Telemetry & Code Line Highlight Grid */}
      <div className="grid sm:grid-cols-2 gap-3">
        {/* Left: Action Log & Variables */}
        <div className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[9.5px] font-mono font-bold uppercase tracking-[0.12em] text-[#ffa116]">
              <Zap size={12} /> Execution Action Log
            </div>
            <p className="mt-2 text-xs text-zinc-200 leading-relaxed font-medium">
              {step.description}
            </p>
          </div>

          <div className="mt-3 border-t border-white/[0.08] pt-2.5">
            <span className="text-[9px] font-mono uppercase text-zinc-500 font-bold block mb-1.5">
              Live State Variables
            </span>
            <div className="flex flex-wrap gap-2 font-mono text-[10px]">
              {Object.entries(step.variables).map(([k, v]) => (
                <span key={k} className="rounded border border-white/[0.08] bg-[#282828] px-2 py-0.5 text-zinc-300">
                  <span className="text-zinc-500">{k}:</span> <strong className="text-[#ffa116]">{v}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Code Synchronizer */}
        <div className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-3.5 font-mono text-[10.5px]">
          <div className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-zinc-500 mb-2">
            Synchronized Code Tracker
          </div>
          <div className="space-y-1">
            {simData.code.map((lineText, idx) => {
              const isCurrent = idx === step.activeCodeLine
              return (
                <div
                  key={idx}
                  className={`px-2 py-1 rounded transition-colors ${
                    isCurrent
                      ? "bg-[#ffa116]/20 text-[#ffa116] font-bold border-l-2 border-[#ffa116]"
                      : "text-zinc-500 opacity-60"
                  }`}
                >
                  <span className="text-zinc-600 mr-2">{idx + 1}</span>
                  {lineText}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
