import React, { useMemo, useState } from "react"
import {
  Check,
  Code2,
  Copy,
  Edit3,
  Plus,
  Search,
  Trash2,
  X,
  FileCode,
  Tag,
  Maximize2,
  Cpu,
  Clock,
  HardDrive,
  FolderTree,
  LayoutGrid,
  ChevronDown,
  RotateCcw,
  SlidersHorizontal,
  Bookmark
} from "lucide-react"
import { Card } from "../ui/Card"
import { CodeHighlighter } from "../ui/CodeHighlighter"
import { TemplateModal } from "./TemplateModal"
import {
  useCodeTemplates,
  type SupportedLang,
  type MultiLangTemplate,
  type CustomTemplate,
  type EditableTemplate
} from "../../hooks/useCodeTemplates"
import { motion, AnimatePresence } from "framer-motion"

const LANG_CONFIG: Record<
  SupportedLang,
  { label: string; short: string; color: string; bg: string; border: string }
> = {
  python:     { label: "Python",     short: "PY",  color: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.3)" },
  java:       { label: "Java",       short: "JV",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
  cpp:        { label: "C++",        short: "C++", color: "#38bdf8", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.3)" },
  typescript: { label: "TypeScript", short: "TS",  color: "#818cf8", bg: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.3)" },
  go:         { label: "Go",         short: "GO",  color: "#c084fc", bg: "rgba(192,132,252,0.12)", border: "rgba(192,132,252,0.3)" }
}

const CATEGORY_META: Record<string, { dot: string; border: string; bg: string; text: string }> = {
  "Binary Search":        { dot: "#38bdf8", border: "border-l-sky-500",      bg: "bg-sky-500/10",    text: "text-sky-400" },
  "Two Pointers":         { dot: "#2dd4bf", border: "border-l-teal-500",     bg: "bg-teal-500/10",   text: "text-teal-400" },
  "Backtracking":         { dot: "#f43f5e", border: "border-l-rose-500",     bg: "bg-rose-500/10",   text: "text-rose-400" },
  "Graph":                { dot: "#c084fc", border: "border-l-purple-500",   bg: "bg-purple-500/10", text: "text-purple-400" },
  "Dynamic Programming":  { dot: "#fbbf24", border: "border-l-amber-500",    bg: "bg-amber-500/10",  text: "text-amber-400" },
  "Linked List":          { dot: "#22d3ee", border: "border-l-cyan-500",     bg: "bg-cyan-500/10",   text: "text-cyan-400" },
  "Tree & Trie":          { dot: "#34d399", border: "border-l-emerald-500",  bg: "bg-emerald-500/10",text: "text-emerald-400" },
  "Data Structures":      { dot: "#fb923c", border: "border-l-orange-500",   bg: "bg-orange-500/10", text: "text-orange-400" },
  "Math & Number Theory": { dot: "#f472b6", border: "border-l-pink-500",     bg: "bg-pink-500/10",   text: "text-pink-400" },
  "Bit Manipulation":     { dot: "#a1a1aa", border: "border-l-zinc-400",     bg: "bg-zinc-500/10",   text: "text-zinc-300" },
  "Strings":              { dot: "#a3e635", border: "border-l-lime-500",     bg: "bg-lime-500/10",   text: "text-lime-400" },
  "Disjoint Set":         { dot: "#818cf8", border: "border-l-indigo-500",   bg: "bg-indigo-500/10", text: "text-indigo-400" },
  "Monotonic Stack":      { dot: "#facc15", border: "border-l-yellow-500",   bg: "bg-yellow-500/10", text: "text-yellow-400" },
  "Intervals":            { dot: "#f87171", border: "border-l-red-500",      bg: "bg-red-500/10",    text: "text-red-400" },
  "Custom":               { dot: "#ffa116", border: "border-l-[#ffa116]",   bg: "bg-[#ffa116]/10",  text: "text-[#ffa116]" }
}

const CATEGORY_ORDER = [
  "Binary Search",
  "Two Pointers",
  "Backtracking",
  "Graph",
  "Dynamic Programming",
  "Linked List",
  "Tree & Trie",
  "Data Structures",
  "Math & Number Theory",
  "Bit Manipulation",
  "Strings",
  "Disjoint Set",
  "Monotonic Stack",
  "Intervals",
  "Custom"
] as const

export const TemplateVault = () => {
  const {
    allTemplates,
    modifiedCount,
    deletedCount,
    preferredLang,
    setPreferredLang,
    addCustomTemplate,
    updateTemplate,
    deleteTemplate,
    resetTemplate,
    restoreAllDefaults
  } = useCodeTemplates()

  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [viewMode, setViewMode] = useState<"tree" | "cards">("tree")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  // Track per-card active language overrides
  const [cardLangOverrides, setCardLangOverrides] = useState<Record<string, SupportedLang>>({})
  
  // Collapsed categories in tree view
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})

  // Big-screen modal state
  const [modalTemplate, setModalTemplate] = useState<EditableTemplate | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Edit / Create Template Modal State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTarget, setEditingTarget] = useState<EditableTemplate | null>(null)
  const [formTitle, setFormTitle] = useState("")
  const [formCategory, setFormCategory] = useState<string>("Custom")
  const [formTags, setFormTags] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formTimeComp, setFormTimeComp] = useState("O(N)")
  const [formSpaceComp, setFormSpaceComp] = useState("O(1)")
  const [formActiveLang, setFormActiveLang] = useState<SupportedLang>("python")
  const [formCodes, setFormCodes] = useState<Partial<Record<SupportedLang, string>>>({})

  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((t) => {
      const matchCategory =
        selectedCategory === "All" ||
        (selectedCategory === "Custom" && !t.isBuiltIn) ||
        t.category === selectedCategory

      const query = search.toLowerCase().trim()
      if (!query) return matchCategory

      const titleMatch = t.title.toLowerCase().includes(query)
      const descMatch = t.description && t.description.toLowerCase().includes(query)
      const tagMatch = t.tags.some((tag) => tag.toLowerCase().includes(query))
      const codeMatch = Object.values(t.code).some(
        (snippet) => snippet && snippet.toLowerCase().includes(query)
      )

      return matchCategory && (titleMatch || descMatch || tagMatch || codeMatch)
    })
  }, [allTemplates, selectedCategory, search])

  // Group templates by category preserving clean paradigm order
  const groupedTemplates = useMemo(() => {
    const map = new Map<string, EditableTemplate[]>()
    for (const cat of CATEGORY_ORDER) {
      map.set(cat, [])
    }

    for (const t of filteredTemplates) {
      const cat = !t.isBuiltIn ? "Custom" : t.category
      if (!map.has(cat)) {
        map.set(cat, [])
      }
      map.get(cat)!.push(t)
    }

    return Array.from(map.entries()).filter(([_, items]) => items.length > 0)
  }, [filteredTemplates])

  const getActiveCode = (
    t: EditableTemplate,
    targetLang: SupportedLang
  ): { lang: SupportedLang; code: string } => {
    if (t.code[targetLang]) {
      return { lang: targetLang, code: t.code[targetLang]! }
    }
    const availableLangs = (Object.keys(t.code) as SupportedLang[]).filter((l) => Boolean(t.code[l]))
    const fallback = availableLangs[0] || "python"
    return { lang: fallback, code: t.code[fallback] || "// Code snippet not available" }
  }

  const handleCopy = (templateId: string, code: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopiedId(templateId)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const openBigScreen = (t: EditableTemplate) => {
    setModalTemplate(t)
    setIsModalOpen(true)
  }

  const toggleCollapse = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }

  const openCreateModal = () => {
    setEditingTarget(null)
    setFormTitle("")
    setFormCategory("Custom")
    setFormTags("")
    setFormDesc("")
    setFormTimeComp("O(N)")
    setFormSpaceComp("O(1)")
    setFormActiveLang(preferredLang)
    setFormCodes({ [preferredLang]: "" })
    setIsFormOpen(true)
  }

  const openEditModal = (t: EditableTemplate, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEditingTarget(t)
    setFormTitle(t.title)
    setFormCategory(t.category)
    setFormTags(t.tags.join(", "))
    setFormDesc(t.description || "")
    setFormTimeComp(t.complexity?.time || "O(N)")
    setFormSpaceComp(t.complexity?.space || "O(1)")
    setFormActiveLang(preferredLang)
    setFormCodes({ ...t.code })
    setIsFormOpen(true)
  }

  const handleDelete = async (t: EditableTemplate, e: React.MouseEvent) => {
    e.stopPropagation()
    const msg = t.isBuiltIn
      ? `Remove "${t.title}" from your templates list? You can restore it anytime.`
      : `Permanently delete custom template "${t.title}"?`

    if (confirm(msg)) {
      await deleteTemplate(t.id)
    }
  }

  const handleReset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("Reset this template back to its default canonical code?")) {
      await resetTemplate(id)
    }
  }

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) return

    const parsedTags = formTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)

    const payload = {
      title: formTitle.trim(),
      category: formCategory,
      tags: parsedTags.length > 0 ? parsedTags : ["Algorithm"],
      description: formDesc.trim(),
      complexity: {
        time: formTimeComp.trim() || "O(N)",
        space: formSpaceComp.trim() || "O(1)"
      },
      code: formCodes
    }

    if (editingTarget) {
      await updateTemplate(editingTarget.id, payload)
    } else {
      await addCustomTemplate(payload)
    }
    setIsFormOpen(false)
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-3 pb-6 font-sans animate-fadeIn min-w-0">
      {/* ── RESTORE DEFAULTS HEADER (If customized) ── */}
      {(modifiedCount > 0 || deletedCount > 0) && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#282828] border border-white/[0.08] text-[10px] font-mono text-zinc-300">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ffa116]" />
            <span>
              {modifiedCount > 0 && `${modifiedCount} modified`}
              {modifiedCount > 0 && deletedCount > 0 && " · "}
              {deletedCount > 0 && `${deletedCount} hidden`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm("Restore all built-in templates back to default factory state?")) {
                restoreAllDefaults()
              }
            }}
            className="flex items-center gap-1 font-bold text-[#ffa116] hover:underline cursor-pointer"
          >
            <RotateCcw size={10} /> Restore Defaults
          </button>
        </div>
      )}

      {/* ── COMMAND HEADER ── */}
      <Card className="p-3 border border-white/[0.08] bg-[#282828] shadow-sm w-full max-w-full min-w-0">
        {/* Search row with integrated action buttons */}
        <div className="flex items-center gap-1.5 w-full">
          <div className="relative flex-1 min-w-0">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search lower bound, dijkstra, memoization..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a1a] pl-8 pr-7 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#ffa116] focus:bg-[#1a1a1a] focus:outline-none font-sans transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Dual View Mode Toggle */}
          <div className="flex items-center bg-[#1a1a1a] p-0.5 rounded-lg border border-white/[0.08] shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-bold rounded transition-all cursor-pointer ${
                viewMode === "tree"
                  ? "bg-[#333333] text-[#ffa116] shadow-sm border border-white/[0.12]"
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent"
              }`}
              title="Hierarchical Pattern Tree View"
            >
              <FolderTree size={11} /> Tree
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-bold rounded transition-all cursor-pointer ${
                viewMode === "cards"
                  ? "bg-[#333333] text-[#ffa116] shadow-sm border border-white/[0.12]"
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent"
              }`}
              title="Syntax Cards Grid View"
            >
              <LayoutGrid size={11} /> Cards
            </button>
          </div>

          {/* New Custom Template Button */}
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/[0.08] bg-[#333333] hover:bg-[#3a3a3a] px-2.5 py-1 text-xs font-mono font-bold text-[#ffa116] transition-all cursor-pointer shrink-0 shadow-sm"
            title="Create Custom Template"
          >
            <Plus size={12} /> Add
          </button>
        </div>

        {/* Global Default Language Selector - 5 Column Grid */}
        <div className="mt-2.5 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
            <div className="flex items-center gap-1">
              <Cpu size={10} className="text-[#ffa116]" />
              <span className="font-semibold uppercase tracking-wider text-zinc-400">Language View</span>
            </div>
            <span className="text-zinc-500">{filteredTemplates.length} patterns</span>
          </div>

          <div className="grid grid-cols-5 gap-1 w-full bg-[#1a1a1a] p-0.5 rounded-lg border border-white/[0.08]">
            {(["python", "java", "cpp", "typescript", "go"] as SupportedLang[]).map((lang) => {
              const meta = LANG_CONFIG[lang]
              const isSelected = preferredLang === lang
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setPreferredLang(lang)}
                  className={`py-0.5 text-center rounded text-[10px] font-mono font-bold transition-all truncate cursor-pointer ${
                    isSelected
                      ? "bg-[#333333] text-zinc-100 shadow-sm border border-white/[0.12]"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  style={isSelected ? { color: meta.color } : {}}
                  title={meta.label}
                >
                  {meta.short}
                </button>
              )
            })}
          </div>
        </div>

        {/* Category Filter Chips - Clean Dots & No Emojis */}
        <div className="mt-2 flex gap-1 overflow-x-auto pt-0.5 scrollbar-none pb-0.5 max-w-full">
          <button
            type="button"
            onClick={() => setSelectedCategory("All")}
            className={`rounded px-2 py-0.5 text-[9.5px] font-mono font-medium transition-all shrink-0 whitespace-nowrap cursor-pointer ${
              selectedCategory === "All"
                ? "bg-[#ffa116]/15 text-[#ffa116] border border-[#ffa116]/40 font-bold shadow-sm"
                : "text-zinc-400 bg-[#1a1a1a] border border-white/[0.08] hover:bg-[#333333] hover:text-zinc-200"
            }`}
          >
            All ({allTemplates.length})
          </button>
          {CATEGORY_ORDER.map((cat) => {
            const count =
              cat === "Custom"
                ? allTemplates.filter((t) => !t.isBuiltIn).length
                : allTemplates.filter((t) => t.category === cat).length

            if (count === 0 && cat !== "Custom") return null
            const isSelected = selectedCategory === cat
            const meta = CATEGORY_META[cat]

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded px-2 py-0.5 text-[9.5px] font-mono font-medium transition-all shrink-0 whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#ffa116]/15 text-[#ffa116] border border-[#ffa116]/40 font-bold shadow-sm"
                    : "text-zinc-400 bg-[#1a1a1a] border border-white/[0.08] hover:bg-[#333333] hover:text-zinc-200"
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: meta?.dot || "#ffa116" }}
                />
                <span>{cat}</span>
                <span className="opacity-60 text-[8.5px]">({count})</span>
              </button>
            )
          })}
        </div>
      </Card>

      {/* ── MAIN CONTENT: TREE VIEW VS CARDS VIEW ── */}
      {filteredTemplates.length === 0 ? (
        <Card className="p-8 text-center border border-white/10 bg-[#222224] w-full rounded-xl">
          <FileCode size={24} className="mx-auto text-zinc-600 mb-2" />
          <h3 className="text-xs font-bold text-zinc-300">No code templates found</h3>
          <p className="mt-1 text-[10.5px] text-zinc-500">
            {search ? `No matches for "${search}".` : "No templates in this category."}
          </p>
        </Card>
      ) : viewMode === "tree" ? (
        /* ══════════════════════════════════════════════════════
           HIERARCHICAL PATTERN TREE (CLEAN ASCII BRANCHES)
           ══════════════════════════════════════════════════════ */
        <div className="space-y-2.5 w-full max-w-full min-w-0">
          {groupedTemplates.map(([categoryName, templates]) => {
            const isCollapsed = collapsedCategories[categoryName] ?? false
            const meta = CATEGORY_META[categoryName] || CATEGORY_META["Custom"]

            return (
              <Card
                key={categoryName}
                className={`p-2.5 border border-white/10 bg-[#222224] shadow-sm w-full max-w-full min-w-0 overflow-hidden rounded-xl border-l-[3px] ${meta.border}`}
              >
                {/* Category Header */}
                <div
                  onClick={() => toggleCollapse(categoryName)}
                  className="flex items-center justify-between cursor-pointer select-none group pb-1"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: meta.dot }}
                    />
                    <h3 className="text-xs font-bold text-zinc-200 group-hover:text-[#ffa116] transition-colors font-mono truncate">
                      {categoryName}
                    </h3>
                    <span className="text-[9px] font-mono text-zinc-500 bg-[#1a1a1a] border border-white/[0.08] px-1 py-0.2 rounded">
                      {templates.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="text-zinc-500 group-hover:text-zinc-300 p-0.5"
                  >
                    <ChevronDown
                      size={13}
                      className={`transform transition-transform duration-200 ${
                        isCollapsed ? "-rotate-90" : "rotate-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Tree Branches */}
                {!isCollapsed && (
                  <div className="mt-1.5 pt-1.5 border-t border-white/[0.06] space-y-1">
                    {templates.map((t, idx) => {
                      const isLast = idx === templates.length - 1
                      const activeLang = cardLangOverrides[t.id] || preferredLang
                      const { code: activeCode } = getActiveCode(t, activeLang)
                      const isCopied = copiedId === t.id

                      return (
                        <div
                          key={t.id}
                          onClick={() => openBigScreen(t)}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-[#1a1a1a] border border-white/[0.08] hover:border-white/[0.16] hover:bg-[#333333] transition-all cursor-pointer group min-w-0 w-full"
                        >
                          {/* ASCII Tree Branch: ├── or └── */}
                          <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1.5">
                            <span className="font-mono text-[11px] text-zinc-600 select-none shrink-0 font-medium">
                              {isLast ? "└──" : "├──"}
                            </span>
                            <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-zinc-200 group-hover:text-[#ffa116] transition-colors truncate">
                                {t.title}
                              </span>
                              {t.complexity && (
                                <span className="text-[8.5px] font-mono font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1 py-0.2 rounded shrink-0">
                                  {t.complexity.time}
                                </span>
                              )}
                              {t.isModified && (
                                <span className="text-[8px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 rounded shrink-0" title="Modified by you">
                                  edited
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions (Copy + Edit + Delete + Inspect) */}
                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => handleCopy(t.id, activeCode, e)}
                              className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold transition-all cursor-pointer ${
                                isCopied
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                  : "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
                              }`}
                              title={`Copy ${LANG_CONFIG[activeLang].label} code`}
                            >
                              {isCopied ? <Check size={9} /> : <Copy size={9} />}
                              <span>{isCopied ? "Copied" : "Copy"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => openEditModal(t, e)}
                              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                              title="Edit / Change this template"
                            >
                              <Edit3 size={11} />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDelete(t, e)}
                              className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                              title="Delete template"
                            >
                              <Trash2 size={11} />
                            </button>

                            {t.isModified && (
                              <button
                                type="button"
                                onClick={(e) => handleReset(t.id, e)}
                                className="p-1 rounded text-amber-500/70 hover:text-amber-400 hover:bg-amber-950/30 transition-colors"
                                title="Reset to original code"
                              >
                                <RotateCcw size={10} />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => openBigScreen(t)}
                              className="p-1 text-zinc-500 hover:text-zinc-200"
                              title="Full Screen View"
                            >
                              <Maximize2 size={10} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════
           CARDS GRID VIEW
           ══════════════════════════════════════════════════════ */
        <div className="space-y-3 w-full max-w-full min-w-0">
          {filteredTemplates.map((t) => {
            const activeLang = cardLangOverrides[t.id] || preferredLang
            const { lang: resolvedLang, code: activeCode } = getActiveCode(t, activeLang)
            const langMeta = LANG_CONFIG[resolvedLang] || LANG_CONFIG.python
            const catMeta = CATEGORY_META[t.category] || CATEGORY_META["Custom"]
            const isCopied = copiedId === t.id

            return (
              <Card
                key={t.id}
                onClick={() => openBigScreen(t)}
                className={`p-3 border border-white/10 bg-[#222224] hover:border-white/20 transition-all shadow-sm flex flex-col justify-between cursor-pointer group hover:shadow-xl w-full max-w-full overflow-hidden rounded-xl border-l-[3px] ${catMeta.border}`}
              >
                <div className="w-full max-w-full min-w-0">
                  {/* Card Header: Category, Title, Actions */}
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`rounded px-1.5 py-0.5 text-[8.5px] font-mono font-bold uppercase tracking-wider shrink-0 ${catMeta.bg} ${catMeta.text} border border-white/5 inline-flex items-center gap-1`}>
                          <span
                            className="w-1 h-1 rounded-full shrink-0"
                            style={{ backgroundColor: catMeta.dot }}
                          />
                          {t.category}
                        </span>
                        <h3 className="text-xs font-bold text-zinc-100 group-hover:text-[#ffa116] transition-colors break-words">
                          {t.title}
                        </h3>
                        {t.isModified && (
                          <span className="text-[8px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 rounded shrink-0">
                            edited
                          </span>
                        )}
                        <Maximize2 size={10} className="text-zinc-500 group-hover:text-zinc-300 shrink-0" />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleCopy(t.id, activeCode, e)}
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9.5px] font-mono font-bold transition-all cursor-pointer shadow-sm ${
                          isCopied
                            ? "bg-[#00b8a3]/20 text-[#00b8a3] border border-[#00b8a3]/40"
                            : "bg-[#333333] hover:bg-[#3a3a3a] text-zinc-300 border border-white/[0.08]"
                        }`}
                        title="Copy code to clipboard"
                      >
                        {isCopied ? <Check size={10} /> : <Copy size={10} />}
                        <span>{isCopied ? "Copied" : "Copy"}</span>
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={(e) => openEditModal(t, e)}
                        className="rounded p-1 text-zinc-500 hover:bg-[#333333] hover:text-zinc-200 transition-colors"
                        title="Edit template code or metadata"
                      >
                        <Edit3 size={11} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(t, e)}
                        className="rounded p-1 text-zinc-500 hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
                        title="Delete template"
                      >
                        <Trash2 size={11} />
                      </button>

                      {t.isModified && (
                        <button
                          type="button"
                          onClick={(e) => handleReset(t.id, e)}
                          className="rounded p-1 text-amber-500/70 hover:bg-amber-950/40 hover:text-amber-400 transition-colors"
                          title="Reset to default code"
                        >
                          <RotateCcw size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {t.description && (
                    <p className="mt-1.5 text-[10.5px] leading-relaxed text-zinc-400 font-sans line-clamp-2 break-words">
                      {t.description}
                    </p>
                  )}

                  {/* Complexity Badges & Tags */}
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    {t.complexity && (
                      <span className="inline-flex items-center gap-1 text-[8.5px] font-mono font-semibold text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                        <Clock size={9} /> {t.complexity.time}
                      </span>
                    )}
                    {t.tags &&
                      t.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-0.5 text-[8.5px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded"
                        >
                          <Tag size={7.5} className="text-zinc-500" /> {tag}
                        </span>
                      ))}
                  </div>

                  {/* Card Inline Language Switcher */}
                  <div
                    className="mt-2.5 flex items-center justify-between border-t border-zinc-900 pt-2 flex-wrap gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1 flex-wrap">
                      {(["python", "java", "cpp", "typescript", "go"] as SupportedLang[]).map((lang) => {
                        const hasCode = Boolean(t.code[lang])
                        if (!hasCode) return null
                        const meta = LANG_CONFIG[lang]
                        const isCardActive = resolvedLang === lang

                        return (
                          <button
                            key={lang}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setCardLangOverrides((prev) => ({ ...prev, [t.id]: lang }))
                            }}
                            className={`rounded px-1.5 py-0.5 text-[8.5px] font-mono font-bold uppercase transition-all cursor-pointer ${
                              isCardActive ? "shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                            }`}
                            style={
                              isCardActive
                                ? {
                                    backgroundColor: meta.bg,
                                    color: meta.color,
                                    border: `1px solid ${meta.border}`
                                  }
                                : { border: "1px solid transparent" }
                            }
                          >
                            {meta.short}
                          </button>
                        )
                      })}
                    </div>

                    <span className="text-[9px] font-mono text-zinc-500 group-hover:text-[#ffa116] transition-colors">
                      Full Studio ↗
                    </span>
                  </div>

                  {/* Code Preview */}
                  <div className="mt-2 relative rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-2 font-mono text-[10px] leading-relaxed overflow-x-auto max-h-32 scrollbar-thin max-w-full">
                    <CodeHighlighter code={activeCode} language={resolvedLang} showLineNumbers={false} />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── BIG SCREEN INSPECTION MODAL ── */}
      <TemplateModal
        template={modalTemplate}
        initialLang={
          (modalTemplate && cardLangOverrides[modalTemplate.id]) || preferredLang
        }
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* ── MULTI-LANGUAGE EDIT / CREATE MODAL ── */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-xl border border-white/[0.08] bg-[#282828] p-4.5 shadow-xl space-y-3.5 font-sans"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Code2 size={16} className="text-[#ffa116]" />
                  <h3 className="text-sm font-bold text-zinc-100">
                    {editingTarget ? `Edit "${editingTarget.title}"` : "Create New Template"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-lg p-1 text-zinc-500 hover:bg-[#333333] hover:text-zinc-200 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSaveForm} className="space-y-3 font-sans text-xs">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Pattern Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0-1 BFS, Top-Down Memo DP"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-3 py-1.5 text-xs text-zinc-100 focus:border-[#ffa116] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Category
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-2.5 py-1.5 text-xs text-zinc-200 focus:border-[#ffa116] focus:outline-none"
                    >
                      {CATEGORY_ORDER.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Time / Space Complexity
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="O(N)"
                        value={formTimeComp}
                        onChange={(e) => setFormTimeComp(e.target.value)}
                        className="w-1/2 rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-2 py-1.5 text-[11px] text-zinc-100 focus:border-[#ffa116] focus:outline-none font-mono"
                        title="Time complexity (e.g. O(N log N))"
                      />
                      <input
                        type="text"
                        placeholder="O(1)"
                        value={formSpaceComp}
                        onChange={(e) => setFormSpaceComp(e.target.value)}
                        className="w-1/2 rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-2 py-1.5 text-[11px] text-zinc-100 focus:border-[#ffa116] focus:outline-none font-mono"
                        title="Space complexity (e.g. O(N))"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Binary Search, Range Query, DP"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-3 py-1.5 text-xs text-zinc-100 focus:border-[#ffa116] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Description & Invariant
                  </label>
                  <input
                    type="text"
                    placeholder="Briefly describe when and how to apply this pattern"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-3 py-1.5 text-xs text-zinc-100 focus:border-[#ffa116] focus:outline-none"
                  />
                </div>

                {/* Multi-Language Code Editor Tabs */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                      Code Snippets ({LANG_CONFIG[formActiveLang].label})
                    </label>
                    <span className="text-[9.5px] font-mono text-zinc-500">
                      {formCodes[formActiveLang] ? "code entered" : "empty"}
                    </span>
                  </div>

                  {/* Language switch tabs inside editor */}
                  <div className="grid grid-cols-5 gap-1 mb-2 bg-[#1a1a1a] p-0.5 rounded-lg border border-white/[0.08]">
                    {(["python", "java", "cpp", "typescript", "go"] as SupportedLang[]).map((lang) => {
                      const meta = LANG_CONFIG[lang]
                      const isSelected = formActiveLang === lang
                      const hasCode = Boolean(formCodes[lang])

                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setFormActiveLang(lang)}
                          className={`py-1 text-center rounded text-[10px] font-mono font-bold transition-all cursor-pointer relative ${
                            isSelected
                              ? "bg-[#333333] text-zinc-100 shadow-sm border border-white/[0.12]"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                          style={isSelected ? { color: meta.color } : {}}
                        >
                          {meta.short}
                          {hasCode && (
                            <span className="absolute top-0.5 right-1 w-1.5 h-1.5 rounded-full bg-[#00b8a3]" />
                          )}
                        </button>
                      )
                    })}
                  </div>

                  <textarea
                    rows={8}
                    placeholder={`Paste ${LANG_CONFIG[formActiveLang].label} code implementation here...`}
                    value={formCodes[formActiveLang] || ""}
                    onChange={(e) =>
                      setFormCodes((prev) => ({
                        ...prev,
                        [formActiveLang]: e.target.value
                      }))
                    }
                    className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-3 font-mono text-[10.5px] text-zinc-100 focus:border-[#ffa116] focus:outline-none resize-y leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] pt-3">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#ffa116] px-4 py-1.5 text-xs font-mono font-bold text-[#1a1a1a] transition-all hover:bg-[#ffa116]/90 cursor-pointer shadow-sm"
                  >
                    {editingTarget ? "Save Changes" : "Create Template"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
