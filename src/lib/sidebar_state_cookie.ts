/** Desktop sidebar open/closed — shared by client (document.cookie) and SSR (cookies()). */
export const SIDEBAR_STATE_COOKIE_NAME = 'sidebar_state'
export const SIDEBAR_STATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export function parseSidebarStateCookieValue(value: string | undefined): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

export function defaultOpenFromSidebarCookie(value: string | undefined, fallback = true): boolean {
  return parseSidebarStateCookieValue(value) ?? fallback
}

export function sidebarStateClientCookieString(open: boolean): string {
  return `${SIDEBAR_STATE_COOKIE_NAME}=${open}; path=/; max-age=${SIDEBAR_STATE_COOKIE_MAX_AGE}`
}
