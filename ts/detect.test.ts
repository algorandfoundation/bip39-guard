import { describe, it, expect } from 'vitest'
import { detectBip39Sequences } from './detect'

describe('detectBip39Sequences', () => {
  it('returns empty array for empty string', () => {
    expect(detectBip39Sequences('')).toEqual([])
  })

  it('returns empty array when no BIP39 words are present', () => {
    expect(detectBip39Sequences('hello world foo bar xyz')).toEqual([])
  })

  it('returns empty array for 4 consecutive BIP39 words (below default threshold)', () => {
    expect(detectBip39Sequences('abandon ability able about')).toEqual([])
  })

  it('detects exactly 5 consecutive BIP39 words', () => {
    const result = detectBip39Sequences('abandon ability able about above')
    expect(result).toHaveLength(1)
    expect(result[0].lineNumber).toBe(1)
    expect(result[0].matchedWords).toEqual(['abandon', 'ability', 'able', 'about', 'above'])
  })

  it('detects a full 12-word mnemonic', () => {
    const mnemonic =
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    const result = detectBip39Sequences(mnemonic)
    expect(result).toHaveLength(1)
    expect(result[0].matchedWords).toHaveLength(12)
  })

  it('returns empty array when BIP39 words are scattered (not consecutive)', () => {
    expect(detectBip39Sequences('abandon xyz ability qqq able')).toEqual([])
  })

  it('detects BIP39 words regardless of case', () => {
    const result = detectBip39Sequences('ABANDON ABILITY ABLE ABOUT ABOVE')
    expect(result).toHaveLength(1)
    expect(result[0].matchedWords).toEqual(['abandon', 'ability', 'able', 'about', 'above'])
  })

  it('detects comma-separated BIP39 words', () => {
    const result = detectBip39Sequences(
      'abandon, ability, able, about, above'
    )
    expect(result).toHaveLength(1)
    expect(result[0].matchedWords).toEqual([
      'abandon',
      'ability',
      'able',
      'about',
      'above',
    ])
  })

  it('detects quoted comma-separated BIP39 words', () => {
    const result = detectBip39Sequences(
      '"abandon", "ability", "able", "about", "above"'
    )
    expect(result).toHaveLength(1)
    expect(result[0].matchedWords).toEqual([
      'abandon',
      'ability',
      'able',
      'about',
      'above',
    ])
  })

  it('does NOT flag words joined without spaces', () => {
    // Semicolons, hyphens joining into a single token — not a mnemonic
    expect(detectBip39Sequences('abandon;ability;able;about;above')).toEqual([])
    expect(detectBip39Sequences('abandon-ability-able-about-above')).toEqual([])
  })

  it('does NOT flag prose with interior punctuation', () => {
    // "they're" has interior apostrophe, "open-source" has interior hyphen
    expect(
      detectBip39Sequences("team) indicate genuine open-source health. They're")
    ).toEqual([])
  })

  it('reports correct line number for multi-line input', () => {
    const content = [
      'const x = 42',
      'console.log("hello")',
      'abandon ability able about above absent absorb abstract',
      'const y = 100',
    ].join('\n')
    const result = detectBip39Sequences(content)
    expect(result).toHaveLength(1)
    expect(result[0].lineNumber).toBe(3)
  })

  it('detects JSON array syntax with BIP39 words', () => {
    const result = detectBip39Sequences(
      '["abandon", "ability", "able", "about", "above"]'
    )
    expect(result).toHaveLength(1)
    expect(result[0].matchedWords).toEqual([
      'abandon',
      'ability',
      'able',
      'about',
      'above',
    ])
  })

  it('respects custom threshold parameter', () => {
    expect(detectBip39Sequences('abandon ability able about', 6)).toEqual([])
    const result = detectBip39Sequences(
      'abandon ability able about above absent',
      6
    )
    expect(result).toHaveLength(1)
    expect(result[0].matchedWords).toHaveLength(6)
  })

  it('detects seed phrase after an = sign with space separation', () => {
    // "MNEMONIC=abandon" — the "=" makes the first token "mnemonic=abandon" which won't match,
    // but the remaining 7 space-separated words still form a sequence
    const content =
      'MNEMONIC=abandon ability able about above absent absorb abstract'
    const result = detectBip39Sequences(content)
    expect(result).toHaveLength(1)
    // "mnemonic=abandon" is one token (contains =), so it doesn't match.
    // The remaining 7 words: ability able about above absent absorb abstract
    expect(result[0].matchedWords).toHaveLength(7)
  })

  it('detects seed phrase with space after = sign', () => {
    const content =
      'MNEMONIC= abandon ability able about above absent absorb abstract'
    const result = detectBip39Sequences(content)
    expect(result).toHaveLength(1)
    expect(result[0].matchedWords).toHaveLength(8)
  })

  it('detects multiple violations across different lines', () => {
    const content = [
      'abandon ability able about above',
      'normal code here',
      'zoo zone zero youth young you',
    ].join('\n')
    const result = detectBip39Sequences(content)
    expect(result).toHaveLength(2)
    expect(result[0].lineNumber).toBe(1)
    expect(result[1].lineNumber).toBe(3)
  })

  it('detects numbered list of BIP39 words on a single line', () => {
    const result = detectBip39Sequences(
      '1. abandon 2. ability 3. able 4. about 5. above'
    )
    expect(result).toHaveLength(1)
    expect(result[0].matchedWords).toEqual([
      'abandon',
      'ability',
      'able',
      'about',
      'above',
    ])
  })

  it('detects parenthesized numbered list of BIP39 words', () => {
    const result = detectBip39Sequences(
      '1) abandon 2) ability 3) able 4) about 5) above'
    )
    expect(result).toHaveLength(1)
    expect(result[0].matchedWords).toEqual([
      'abandon',
      'ability',
      'able',
      'about',
      'above',
    ])
  })

  it('detects single-quoted BIP39 words', () => {
    const result = detectBip39Sequences(
      "'abandon' 'ability' 'able' 'about' 'above'"
    )
    expect(result).toHaveLength(1)
    expect(result[0].matchedWords).toHaveLength(5)
  })

  it('detects backtick-quoted BIP39 words', () => {
    const result = detectBip39Sequences(
      '`abandon` `ability` `able` `about` `above`'
    )
    expect(result).toHaveLength(1)
    expect(result[0].matchedWords).toHaveLength(5)
  })

  it('does NOT flag words with interior punctuation after stripping', () => {
    // "can't" → strip quotes → "can't" still has interior apostrophe
    // "re-enter" → strip → "re-enter" still has interior hyphen
    expect(
      detectBip39Sequences("can't won't they're you're we're")
    ).toEqual([])
  })

  it('does NOT flag numbered non-BIP39 words', () => {
    expect(
      detectBip39Sequences('1. hello 2. world 3. testing 4. something 5. random')
    ).toEqual([])
  })

  it('detects env var with double-quoted mnemonic (last word recovered)', () => {
    const result = detectBip39Sequences(
      'MNEMONIC="abandon ability able about above absent absorb abstract"'
    )
    expect(result).toHaveLength(1)
    // MNEMONIC="abandon is one token with interior = and " → no match.
    // ability through absorb = 6 clean matches.
    // abstract" → strip trailing " → abstract → match. Total: 7.
    expect(result[0].matchedWords).toHaveLength(7)
    expect(result[0].matchedWords[6]).toBe('abstract')
  })
})
