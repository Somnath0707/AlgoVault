import { useEffect, useState, useCallback } from "react"
import { Storage } from "@plasmohq/storage"
import type { PracticeSession } from "../lib/session-engine/types"
import { deriveClocks } from "../lib/session-engine/EngineKernel"

const storage = new Storage({ area: "local" })
const ACTIVE_SESSION_KEY = "algovault.session.active"

export function usePracticeSession() {
  const [session, setSession] = useState<PracticeSession | null>(null)
  const [now, setNow] = useState<number>(Date.now())

  // 1. Initial storage load & Reactive Subscriptions
  useEffect(() => {
    let mounted = true

    const parseSession = (raw: any): PracticeSession | null => {
      if (!raw) return null
      if (typeof raw === "string") {
        try {
          return JSON.parse(raw)
        } catch {
          return null
        }
      }
      if (typeof raw === "object") return raw as PracticeSession
      return null
    }

    storage.get<any>(ACTIVE_SESSION_KEY).then((data) => {
      if (mounted) {
        setSession(parseSession(data))
      }
    })

    const storageListener = (changes: Record<string, any>, areaName: string) => {
      if (areaName === "local" && changes[ACTIVE_SESSION_KEY]) {
        const nextSession = parseSession(changes[ACTIVE_SESSION_KEY].newValue)
        if (mounted) {
          setSession(nextSession)
        }
      }
    }

    const messageListener = (msg: any) => {
      if (msg && msg.action === "session_updated_v2") {
        const nextSession = parseSession(msg.session)
        if (mounted) {
          setSession(nextSession)
        }
      }
    }

    chrome.storage.onChanged.addListener(storageListener)
    chrome.runtime.onMessage.addListener(messageListener)

    return () => {
      mounted = false
      chrome.storage.onChanged.removeListener(storageListener)
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [])

  // 2. Centralized 1-second Local Tick (Zero Storage Writes)
  useEffect(() => {
    if (!session) return

    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [session?.id, session?.st, session?.tActiveStart])

  // 3. Derived Clocks (Pure math calculations)
  const clocks = deriveClocks(session, now)

  // 4. Action Handlers (State Transitions with Optimistic UI updates)
  const pauseSession = useCallback((reason: "MANUAL" | "IDLE" = "MANUAL") => {
    chrome.runtime.sendMessage({ action: "session_pause_v2", reason }, (res) => {
      if (res?.ok && res.session) {
        setSession(res.session)
      }
    })
  }, [])

  const resumeSession = useCallback(() => {
    chrome.runtime.sendMessage({ action: "session_resume_v2" }, (res) => {
      if (res?.ok && res.session) {
        setSession(res.session)
      }
    })
  }, [])

  const resetSession = useCallback(() => {
    chrome.runtime.sendMessage({ action: "session_reset_v2" }, (res) => {
      if (res?.ok) {
        setSession(null)
      }
    })
  }, [])

  const stopAllRunningSessions = useCallback(() => {
    return new Promise<number>((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "session_stop_all_running_v2" }, (res) => {
        const error = chrome.runtime.lastError
        if (error) {
          reject(new Error(error.message))
          return
        }
        if (!res?.ok) {
          reject(new Error(res?.error || "Could not stop active timers."))
          return
        }
        if (res.stopped > 0) setSession(null)
        resolve(Number(res.stopped) || 0)
      })
    })
  }, [])

  const finishSession = useCallback((language?: string) => {
    chrome.runtime.sendMessage({ action: "session_finish_v2", language }, (res) => {
      if (res?.ok && res.session) {
        setSession(res.session)
      }
    })
  }, [])

  const logTimeSession = useCallback((language?: string) => {
    chrome.runtime.sendMessage({ action: "session_log_time_v2", language })
  }, [])

  return {
    session,
    clocks,
    pauseSession,
    resumeSession,
    resetSession,
    stopAllRunningSessions,
    finishSession,
    logTimeSession
  }
}
