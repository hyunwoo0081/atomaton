// packages/db/src/__tests__/crypto.spec.ts
process.env.MASTER_KEY = 'this_is_a_32_byte_test_key_!!!!'

import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '../crypto'

describe('Crypto Module (AES-256-GCM)', () => {
  // --- Normal Cases ---

  it('should encrypt and then decrypt back to the original text', () => {
    const originalText = 'Hello Atomaton!'
    const encrypted = encrypt(originalText)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(originalText)
    expect(encrypted).not.toBe(originalText)
  })

  it('should handle long strings correctly (10KB+)', () => {
    const longText = 'A'.repeat(1024 * 10)
    const encrypted = encrypt(longText)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(longText)
  })

  it('should produce different encrypted outputs for the same input (IV randomization)', () => {
    const text = 'Secret'
    const enc1 = encrypt(text)
    const enc2 = encrypt(text)

    expect(enc1).not.toBe(enc2)
    expect(decrypt(enc1)).toBe(text)
    expect(decrypt(enc2)).toBe(text)
  })

  // --- Edge Cases ---

  it('should throw an error if the encrypted data is tampered with (Integrity Check)', () => {
    const text = 'Secure Data'
    const encryptedHex = encrypt(text)

    // Modify one byte in the middle of the hex string ensuring we actually change it
    const originalChar = encryptedHex.charAt(40)
    const replacementChar = originalChar === '0' ? '1' : '0'
    const tamperedHex =
      encryptedHex.substring(0, 40) +
      replacementChar +
      encryptedHex.substring(41)

    expect(() => decrypt(tamperedHex)).toThrow()
  })

  it('should handle empty string without error', () => {
    const text = ''
    const encrypted = encrypt(text)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe('')
  })
})
