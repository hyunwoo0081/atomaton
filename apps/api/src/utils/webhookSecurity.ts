// apps/api/src/utils/webhookSecurity.ts
import { Request } from 'express'

export interface WebhookSecurityConfig {
  allowedIps?: string[] | string
  allowedOrigins?: string[] | string
}

export interface WebhookSourceInfo {
  ip: string
  origin?: string
  referer?: string
  host?: string
}

export interface WebhookAccessResult {
  allowed: boolean
  reason?: string
  sourceInfo: WebhookSourceInfo
}

/**
 * Normalizes IP address strings by trimming and stripping IPv6-mapped IPv4 prefix (::ffff:).
 */
export const normalizeIp = (ip: string): string => {
  let cleaned = ip.trim()
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.substring(7)
  }
  return cleaned
}

/**
 * Extracts the true client IP address from request headers or socket.
 * Handles x-forwarded-for (taking the first client IP), x-real-ip, req.ip, and socket.remoteAddress.
 */
export const getClientIp = (req: Request): string => {
  const headers = req.headers || {}
  const xForwardedFor = headers['x-forwarded-for']
  if (typeof xForwardedFor === 'string' && xForwardedFor.trim()) {
    const first = xForwardedFor.split(',')[0].trim()
    if (first) return normalizeIp(first)
  } else if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
    const first = xForwardedFor[0].split(',')[0].trim()
    if (first) return normalizeIp(first)
  }

  const xRealIp = headers['x-real-ip']
  if (typeof xRealIp === 'string' && xRealIp.trim()) {
    return normalizeIp(xRealIp.trim())
  }

  if (req.ip) {
    return normalizeIp(req.ip)
  }

  if (req.socket?.remoteAddress) {
    return normalizeIp(req.socket.remoteAddress)
  }

  return 'unknown'
}

/**
 * Splits comma/newline-delimited string or arrays into cleaned, non-empty string arrays.
 */
export const parseList = (input?: string[] | string): string[] => {
  if (!input) return []
  if (Array.isArray(input)) {
    return input.map((s) => s.trim()).filter((s) => s.length > 0)
  }
  if (typeof input === 'string') {
    return input
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }
  return []
}

/**
 * Converts an IPv4 dotted string into a 32-bit unsigned integer.
 */
const ipv4ToLong = (ip: string): number | null => {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let result = 0
  for (const part of parts) {
    const num = parseInt(part, 10)
    if (isNaN(num) || num < 0 || num > 255) return null
    result = ((result << 8) + num) >>> 0
  }
  return result
}

/**
 * Checks whether an IPv4 address falls within a CIDR subnet range (e.g. 192.168.1.0/24).
 */
export const matchesCidr = (ip: string, cidr: string): boolean => {
  const [range, bitsStr] = cidr.split('/')
  if (!range || !bitsStr) return false

  const bits = parseInt(bitsStr, 10)
  if (isNaN(bits) || bits < 0 || bits > 32) return false

  const ipLong = ipv4ToLong(ip)
  const rangeLong = ipv4ToLong(range)
  if (ipLong === null || rangeLong === null) return false

  if (bits === 0) return true
  const mask = (~0 << (32 - bits)) >>> 0
  return (ipLong & mask) === (rangeLong & mask)
}

/**
 * Checks whether a client IP matches a single rule (exact, CIDR, wildcard, or localhost).
 */
export const matchesIpRule = (clientIp: string, rule: string): boolean => {
  const normClient = normalizeIp(clientIp)
  const normRule = normalizeIp(rule)

  if (normRule === '*' || normRule === '') return true

  // Localhost aliases
  const isClientLocal = normClient === '127.0.0.1' || normClient === '::1'
  const isRuleLocal =
    normRule === '127.0.0.1' ||
    normRule === '::1' ||
    normRule.toLowerCase() === 'localhost'
  if (isClientLocal && isRuleLocal) return true

  // CIDR notation (e.g. 10.0.0.0/8, 192.168.1.0/24)
  if (normRule.includes('/')) {
    return matchesCidr(normClient, normRule)
  }

  // Wildcard notation (e.g. 192.168.1.*)
  if (normRule.includes('*')) {
    try {
      const regexStr =
        '^' + normRule.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
      return new RegExp(regexStr).test(normClient)
    } catch {
      return false
    }
  }

  // Exact IP match
  return normClient.toLowerCase() === normRule.toLowerCase()
}

/**
 * Helper to match domain names with optional wildcard (e.g. *.example.com).
 */
export const matchesDomain = (host: string, pattern: string): boolean => {
  const normHost = host.trim().toLowerCase()
  const normPattern = pattern.trim().toLowerCase()

  if (normPattern === '*' || normPattern === '') return true
  if (normHost === normPattern) return true

  if (normPattern.startsWith('*.')) {
    const rootDomain = normPattern.substring(2)
    return normHost.endsWith('.' + rootDomain) || normHost === rootDomain
  }

  return false
}

/**
 * Checks whether request source headers (Origin, Referer, Host) match an origin rule.
 */
export const matchesOriginRule = (
  sourceInfo: WebhookSourceInfo,
  rule: string
): boolean => {
  const normRule = rule.trim().toLowerCase()
  if (normRule === '*' || normRule === '') return true

  const originCandidates: string[] = []

  if (sourceInfo.origin) {
    originCandidates.push(sourceInfo.origin.trim().toLowerCase())
    try {
      const parsed = new URL(sourceInfo.origin)
      originCandidates.push(parsed.hostname.toLowerCase())
    } catch {
      // Ignore URL parse error
    }
  }

  if (sourceInfo.referer) {
    originCandidates.push(sourceInfo.referer.trim().toLowerCase())
    try {
      const parsed = new URL(sourceInfo.referer)
      originCandidates.push(parsed.hostname.toLowerCase())
    } catch {
      // Ignore URL parse error
    }
  }

  if (sourceInfo.host) {
    originCandidates.push(sourceInfo.host.trim().toLowerCase())
  }

  for (const candidate of originCandidates) {
    if (candidate === normRule) return true
    if (matchesDomain(candidate, normRule)) return true

    if (normRule.includes('*')) {
      try {
        const escaped = normRule
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\\\*/g, '.*')
        if (new RegExp('^' + escaped + '$', 'i').test(candidate)) return true
      } catch {
        // Ignore regex error
      }
    }
  }

  return false
}

/**
 * Main verification entrypoint.
 * If neither allowedIps nor allowedOrigins is configured, allows all requests by default.
 */
export const checkWebhookAccess = (
  req: Request,
  config?: WebhookSecurityConfig
): WebhookAccessResult => {
  const clientIp = getClientIp(req)
  const headers = req.headers || {}
  const origin = headers['origin'] as string | undefined
  const referer = headers['referer'] as string | undefined
  const host = headers['host'] as string | undefined

  const sourceInfo: WebhookSourceInfo = {
    ip: clientIp,
    origin,
    referer,
    host,
  }

  const ipRules = parseList(config?.allowedIps)
  const originRules = parseList(config?.allowedOrigins)

  // Default: If no rules are set, allow all by default ("입력 안하면 전체 허용")
  if (ipRules.length === 0 && originRules.length === 0) {
    return {
      allowed: true,
      reason: 'No restrictions configured (allow all by default)',
      sourceInfo,
    }
  }

  const hasIpMatch =
    ipRules.length > 0 && ipRules.some((rule) => matchesIpRule(clientIp, rule))
  const hasOriginMatch =
    originRules.length > 0 &&
    originRules.some((rule) => matchesOriginRule(sourceInfo, rule))

  // If both IP rules and Origin rules are configured, pass if either matches
  if (ipRules.length > 0 && originRules.length > 0) {
    if (hasIpMatch || hasOriginMatch) {
      return { allowed: true, sourceInfo }
    }
    return {
      allowed: false,
      reason: `Neither IP (${clientIp}) nor Origin (${origin || referer || 'none'}) matched allowed lists`,
      sourceInfo,
    }
  }

  // If only IP rules are configured
  if (ipRules.length > 0) {
    if (hasIpMatch) {
      return { allowed: true, sourceInfo }
    }
    return {
      allowed: false,
      reason: `Client IP (${clientIp}) is not in allowed IP list`,
      sourceInfo,
    }
  }

  // If only Origin rules are configured
  if (originRules.length > 0) {
    if (hasOriginMatch) {
      return { allowed: true, sourceInfo }
    }
    return {
      allowed: false,
      reason: `Request Origin (${origin || referer || host || 'none'}) is not in allowed Origin list`,
      sourceInfo,
    }
  }

  return { allowed: true, sourceInfo }
}
