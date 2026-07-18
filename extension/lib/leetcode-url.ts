export function getLeetCodeProblemSlug(pathname = window.location.pathname): string | null {
  const match = pathname.match(/\/problems\/([^/?#]+)/)
  if (!match?.[1]) return null

  try {
    return decodeURIComponent(match[1]).trim().toLowerCase() || null
  } catch {
    return match[1].trim().toLowerCase() || null
  }
}
