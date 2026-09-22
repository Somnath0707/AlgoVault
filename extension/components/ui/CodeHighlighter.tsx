import React, { useMemo } from "react"

interface CodeHighlighterProps {
  code: string
  language?: string
  showLineNumbers?: boolean
  className?: string
}

// Token categories & styling
const KEYWORDS = new Set([
  "def", "func", "class", "public", "private", "protected", "static", "final",
  "return", "if", "else", "elif", "while", "for", "in", "range", "const", "let",
  "var", "struct", "type", "import", "package", "new", "this", "self", "break",
  "continue", "yield", "async", "await", "from", "as", "auto", "template",
  "typename", "namespace", "using", "iota", "swap"
])

const TYPES = new Set([
  "int", "long", "double", "float", "boolean", "bool", "void", "string", "char",
  "List", "Map", "Set", "Queue", "Deque", "PriorityQueue", "ArrayDeque", "HashMap",
  "ArrayList", "vector", "pair", "stack", "queue", "priority_queue", "unordered_map",
  "number", "bigint", "any", "int64", "int32", "uint", "byte", "rune", "int[]",
  "long[]", "boolean[]", "String", "Integer", "Long", "Double", "Boolean",
  "DSU", "Trie", "TrieNode", "FenwickTree", "StringHasher", "Item", "PQ"
])

const CONSTANTS = new Set([
  "True", "False", "true", "false", "null", "nil", "None", "nullptr", "Infinity",
  "MAX_VALUE", "MIN_VALUE", "MaxInt32"
])

function highlightLine(line: string): React.ReactNode[] {
  const tokenRegex = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?(?:e\d+|L|n)?\b|\b[a-zA-Z_]\w*\b|[^\s\w]+|\s+)/g

  const nodes: React.ReactNode[] = []
  let match: RegExpExecArray | null
  let keyIndex = 0

  while ((match = tokenRegex.exec(line)) !== null) {
    const token = match[0]
    const key = `${keyIndex++}-${token}`

    if (token.startsWith("//") || token.startsWith("#") || token.startsWith("/*")) {
      nodes.push(
        <span key={key} className="text-zinc-500 italic select-text">
          {token}
        </span>
      )
    } else if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'")) ||
      (token.startsWith("`") && token.endsWith("`"))
    ) {
      nodes.push(
        <span key={key} className="text-emerald-400 font-medium">
          {token}
        </span>
      )
    } else if (/^\d/.test(token) || CONSTANTS.has(token)) {
      nodes.push(
        <span key={key} className="text-purple-400 font-semibold">
          {token}
        </span>
      )
    } else if (KEYWORDS.has(token)) {
      nodes.push(
        <span key={key} className="text-sky-400 font-bold">
          {token}
        </span>
      )
    } else if (TYPES.has(token)) {
      nodes.push(
        <span key={key} className="text-amber-400 font-semibold">
          {token}
        </span>
      )
    } else if (/^[A-Z][a-zA-Z0-9_]*$/.test(token)) {
      nodes.push(
        <span key={key} className="text-[#ffa116] font-medium">
          {token}
        </span>
      )
    } else if (/[&|=<>!+\-*%/]/.test(token)) {
      nodes.push(
        <span key={key} className="text-rose-400/90 font-medium">
          {token}
        </span>
      )
    } else {
      nodes.push(
        <span key={key} className="text-zinc-200">
          {token}
        </span>
      )
    }
  }

  return nodes.length > 0 ? nodes : [<span key="empty">&nbsp;</span>]
}

export const CodeHighlighter: React.FC<CodeHighlighterProps> = ({
  code,
  showLineNumbers = true,
  className = ""
}) => {
  const lines = useMemo(() => code.replace(/\r\n/g, "\n").split("\n"), [code])

  return (
    <div
      className={`font-mono text-[10.5px] leading-relaxed select-text overflow-x-auto min-w-0 max-w-full ${className}`}
      style={{ tabSize: 2 }}
    >
      <div className="min-w-fit space-y-0.5">
        {lines.map((line, idx) => (
          <div key={idx} className="flex hover:bg-zinc-900/40 transition-colors group">
            {showLineNumbers && (
              <span className="w-7 pr-2 text-right text-zinc-600 select-none text-[10px] group-hover:text-zinc-400 border-r border-zinc-800/80 shrink-0">
                {idx + 1}
              </span>
            )}
            <span className="pl-2.5 whitespace-pre select-text">
              {highlightLine(line)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
