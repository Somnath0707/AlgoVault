import React, { useState } from "react"
import {
  Check,
  Code2,
  Copy,
  Tag,
  X,
  Clock,
  HardDrive
} from "lucide-react"
import { motion } from "framer-motion"
import { CodeHighlighter } from "../ui/CodeHighlighter"
import type { MultiLangTemplate, CustomTemplate, SupportedLang } from "../../hooks/useCodeTemplates"

interface TemplateModalProps {
  template: MultiLangTemplate | CustomTemplate | null
  initialLang: SupportedLang
  isOpen: boolean
  onClose: () => void
}

const LANG_CONFIG: Record<
  SupportedLang,
  { label: string; badge: string; color: string; bg: string; border: string }
> = {
  python: { label: "Python", badge: "PY", color: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.25)" },
  java: { label: "Java", badge: "JAVA", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)" },
  cpp: { label: "C++", badge: "C++", color: "#38bdf8", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.25)" },
  typescript: { label: "TypeScript", badge: "TS", color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)" },
  go: { label: "Go", badge: "GO", color: "#a855f7", bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.25)" }
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  template,
  initialLang,
  isOpen,
  onClose
}) => {
  const [activeLang, setActiveLang] = useState<SupportedLang>(initialLang)
  const [copied, setCopied] = useState(false)

  if (!isOpen || !template) return null

  const getCode = (lang: SupportedLang): string => {
    if (template.code[lang]) return template.code[lang]!
    const fallback = (Object.keys(template.code) as SupportedLang[]).find((l) => Boolean(template.code[l]))
    return fallback ? template.code[fallback]! : "// Code not available in this language"
  }

  const currentCode = getCode(activeLang)
  const activeMeta = LANG_CONFIG[activeLang] || LANG_CONFIG.python

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-2xl max-h-[94vh] flex flex-col rounded-xl border border-white/[0.08] bg-[#282828] shadow-2xl overflow-hidden font-sans"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-3 sm:p-4 border-b border-white/[0.06] bg-[#282828]">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="rounded px-1.5 py-0.5 text-[9px] font-mono font-bold bg-[#ffa116]/10 border border-[#ffa116]/20 text-[#ffa116] uppercase tracking-wider">
                {template.category}
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-zinc-100 break-words">
                {template.title}
              </h2>
            </div>

            {template.description && (
              <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed font-sans mt-1">
                {template.description}
              </p>
            )}

            {/* Badges & Tags */}
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              {template.complexity && (
                <>
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                    <Clock size={10} /> {template.complexity.time}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold text-sky-400 bg-sky-950/40 border border-sky-800/40 px-1.5 py-0.5 rounded">
                    <HardDrive size={10} /> Space: {template.complexity.space}
                  </span>
                </>
              )}
              {template.tags &&
                template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[9px] font-mono text-zinc-400 bg-[#1a1a1a] border border-white/[0.08] px-1.5 py-0.5 rounded"
                  >
                    <Tag size={8} className="text-zinc-500" /> {tag}
                  </span>
                ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-[#333333] hover:text-zinc-100 transition-colors shrink-0 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Language Tabs & Copy Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.06] bg-[#1a1a1a] gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none max-w-full">
            {(["python", "java", "cpp", "typescript", "go"] as SupportedLang[]).map((lang) => {
              const hasCode = Boolean(template.code[lang])
              if (!hasCode) return null
              const meta = LANG_CONFIG[lang]
              const isSelected = activeLang === lang

              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveLang(lang)}
                  className={`rounded px-2 py-0.5 text-[10px] sm:text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                    isSelected
                      ? "shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-[#333333]"
                  }`}
                  style={
                    isSelected
                      ? {
                          backgroundColor: meta.bg,
                          color: meta.color,
                          border: `1px solid ${meta.border}`
                        }
                      : { border: "1px solid transparent" }
                  }
                >
                  {meta.badge}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold transition-all cursor-pointer shadow-sm shrink-0 ${
              copied
                ? "bg-[#00b8a3]/20 text-[#00b8a3] border border-[#00b8a3]/40"
                : "bg-[#ffa116] hover:bg-[#ffa116]/90 text-[#1a1a1a]"
            }`}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span>{copied ? "Copied!" : `Copy ${activeMeta.badge}`}</span>
          </button>
        </div>

        {/* Code Content with Syntax Highlighting */}
        <div className="flex-1 overflow-y-auto p-3 bg-[#1a1a1a] select-text max-w-full">
          <CodeHighlighter code={currentCode} language={activeLang} showLineNumbers={true} />
        </div>

        {/* Modal Footer */}
        <div className="px-3 py-2 border-t border-white/[0.06] bg-[#282828] flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>ESC to close</span>
          <span className="text-[#ffa116]">AlgoVault STL</span>
        </div>
      </motion.div>
    </div>
  )
}
