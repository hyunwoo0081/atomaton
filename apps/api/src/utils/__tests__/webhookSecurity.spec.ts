// apps/api/src/utils/__tests__/webhookSecurity.spec.ts
import { describe, it, expect } from 'vitest'
import { Request } from 'express'
import {
  normalizeIp,
  getClientIp,
  parseList,
  matchesCidr,
  matchesIpRule,
  matchesDomain,
  matchesOriginRule,
  checkWebhookAccess,
} from '../webhookSecurity'

describe('Webhook Security Utility', () => {
  describe('normalizeIp', () => {
    it('should strip IPv6-mapped IPv4 prefix (::ffff:)', () => {
      expect(normalizeIp('::ffff:192.168.1.10')).toBe('192.168.1.10')
      expect(normalizeIp('  ::ffff:10.0.0.1  ')).toBe('10.0.0.1')
    })

    it('should trim standard IPv4 and IPv6 strings', () => {
      expect(normalizeIp('  127.0.0.1 ')).toBe('127.0.0.1')
      expect(normalizeIp('::1')).toBe('::1')
    })
  })

  describe('getClientIp', () => {
    it('should extract the first client IP from comma-separated x-forwarded-for header', () => {
      const req = {
        headers: {
          'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
        },
      } as unknown as Request

      expect(getClientIp(req)).toBe('203.0.113.195')
    })

    it('should extract IP from x-real-ip if x-forwarded-for is missing', () => {
      const req = {
        headers: {
          'x-real-ip': '::ffff:198.51.100.42',
        },
      } as unknown as Request

      expect(getClientIp(req)).toBe('198.51.100.42')
    })

    it('should fallback to req.ip or socket.remoteAddress', () => {
      const reqWithIp = {
        headers: {},
        ip: '10.0.0.5',
      } as unknown as Request
      expect(getClientIp(reqWithIp)).toBe('10.0.0.5')

      const reqWithSocket = {
        headers: {},
        socket: { remoteAddress: '172.16.0.9' },
      } as unknown as Request
      expect(getClientIp(reqWithSocket)).toBe('172.16.0.9')
    })
  })

  describe('parseList', () => {
    it('should handle array of strings', () => {
      expect(parseList([' 1.1.1.1 ', '', '2.2.2.2'])).toEqual([
        '1.1.1.1',
        '2.2.2.2',
      ])
    })

    it('should handle newline or comma-separated string', () => {
      const text = '192.168.1.1\n10.0.0.0/24, 127.0.0.1\n\n'
      expect(parseList(text)).toEqual([
        '192.168.1.1',
        '10.0.0.0/24',
        '127.0.0.1',
      ])
    })

    it('should return empty array for undefined or empty input', () => {
      expect(parseList(undefined)).toEqual([])
      expect(parseList('')).toEqual([])
      expect(parseList([])).toEqual([])
    })
  })

  describe('matchesCidr', () => {
    it('should match IPs within a /24 subnet', () => {
      expect(matchesCidr('192.168.1.5', '192.168.1.0/24')).toBe(true)
      expect(matchesCidr('192.168.1.254', '192.168.1.0/24')).toBe(true)
      expect(matchesCidr('192.168.2.1', '192.168.1.0/24')).toBe(false)
    })

    it('should match IPs within a /8 subnet', () => {
      expect(matchesCidr('10.5.20.99', '10.0.0.0/8')).toBe(true)
      expect(matchesCidr('11.0.0.1', '10.0.0.0/8')).toBe(false)
    })

    it('should match 0.0.0.0/0 for all IPv4', () => {
      expect(matchesCidr('1.2.3.4', '0.0.0.0/0')).toBe(true)
    })
  })

  describe('matchesIpRule', () => {
    it('should match exact IP', () => {
      expect(matchesIpRule('192.168.1.1', '192.168.1.1')).toBe(true)
      expect(matchesIpRule('192.168.1.1', '192.168.1.2')).toBe(false)
    })

    it('should match wildcard IP pattern', () => {
      expect(matchesIpRule('192.168.1.42', '192.168.1.*')).toBe(true)
      expect(matchesIpRule('192.168.2.42', '192.168.1.*')).toBe(false)
    })

    it('should match localhost aliases', () => {
      expect(matchesIpRule('127.0.0.1', 'localhost')).toBe(true)
      expect(matchesIpRule('::1', '127.0.0.1')).toBe(true)
      expect(matchesIpRule('127.0.0.1', '::1')).toBe(true)
    })

    it('should match wildcard *', () => {
      expect(matchesIpRule('203.0.113.1', '*')).toBe(true)
    })
  })

  describe('matchesDomain and matchesOriginRule', () => {
    it('should match exact origin and domains', () => {
      expect(matchesDomain('api.github.com', 'api.github.com')).toBe(true)
      expect(matchesDomain('other.com', 'api.github.com')).toBe(false)
    })

    it('should match wildcard subdomains (*.example.com)', () => {
      expect(matchesDomain('hooks.stripe.com', '*.stripe.com')).toBe(true)
      expect(matchesDomain('stripe.com', '*.stripe.com')).toBe(true)
      expect(matchesDomain('fake-stripe.com', '*.stripe.com')).toBe(false)
    })

    it('should match sourceInfo Origin URL with rule', () => {
      const source = {
        ip: '1.2.3.4',
        origin: 'https://hooks.stripe.com',
      }
      expect(matchesOriginRule(source, 'https://hooks.stripe.com')).toBe(true)
      expect(matchesOriginRule(source, '*.stripe.com')).toBe(true)
      expect(matchesOriginRule(source, 'https://github.com')).toBe(false)
    })
  })

  describe('checkWebhookAccess', () => {
    it('should allow all requests when no rules are configured (default allow all)', () => {
      const req = {
        headers: { 'x-forwarded-for': '123.45.67.89' },
      } as unknown as Request

      const res = checkWebhookAccess(req, {})
      expect(res.allowed).toBe(true)
      expect(res.reason).toContain('No restrictions configured')
    })

    it('should allow request when client IP is in allowedIps list', () => {
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.55' },
      } as unknown as Request

      const res = checkWebhookAccess(req, {
        allowedIps: ['192.168.1.0/24', '10.0.0.1'],
      })
      expect(res.allowed).toBe(true)
      expect(res.sourceInfo.ip).toBe('192.168.1.55')
    })

    it('should block request when client IP is not in allowedIps list', () => {
      const req = {
        headers: { 'x-forwarded-for': '203.0.113.9' },
      } as unknown as Request

      const res = checkWebhookAccess(req, {
        allowedIps: ['192.168.1.0/24', '127.0.0.1'],
      })
      expect(res.allowed).toBe(false)
      expect(res.reason).toContain(
        'Client IP (203.0.113.9) is not in allowed IP list'
      )
    })

    it('should allow request when Origin matches allowedOrigins', () => {
      const req = {
        headers: {
          'x-forwarded-for': '203.0.113.9',
          origin: 'https://github.com',
        },
      } as unknown as Request

      const res = checkWebhookAccess(req, {
        allowedOrigins: ['https://github.com'],
      })
      expect(res.allowed).toBe(true)
    })

    it('should pass if either IP or Origin matches when both are configured', () => {
      const req = {
        headers: {
          'x-forwarded-for': '192.168.1.50',
          origin: 'https://untrusted.com',
        },
      } as unknown as Request

      const res = checkWebhookAccess(req, {
        allowedIps: ['192.168.1.50'],
        allowedOrigins: ['https://trusted.com'],
      })
      expect(res.allowed).toBe(true)
    })

    it('should block if neither IP nor Origin matches when both are configured', () => {
      const req = {
        headers: {
          'x-forwarded-for': '10.99.99.99',
          origin: 'https://untrusted.com',
        },
      } as unknown as Request

      const res = checkWebhookAccess(req, {
        allowedIps: ['192.168.1.50'],
        allowedOrigins: ['https://trusted.com'],
      })
      expect(res.allowed).toBe(false)
      expect(res.reason).toContain('Neither IP')
    })
  })
})
