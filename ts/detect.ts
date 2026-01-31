import { BIP39_WORDS } from './wordlist'

export interface Bip39Violation {
  lineNumber: number
  matchedWords: string[]
  line: string
}

/**
 * Strip surrounding non-alphabetic characters from a token and classify it.
 * Returns the stripped word if the core is pure alpha, or null if it contains
 * interior punctuation (e.g. "they're", "open-source").
 * Returns 'skip' for tokens that are entirely non-alpha (e.g. "1.", "//", "2)").
 */
function stripToken(token: string): string | null | 'skip' {
  // Strip leading non-alpha
  const start = token.search(/[a-z]/)
  if (start === -1) return 'skip' // entirely non-alpha (e.g. "1.", "//", "---")

  // Strip trailing non-alpha
  let end = token.length - 1
  while (end >= start && !/[a-z]/.test(token[end])) end--

  const core = token.slice(start, end + 1)

  // If core contains any non-alpha character, it has interior punctuation
  if (!/^[a-z]+$/.test(core)) return null

  return core
}

/**
 * Detect sequences of consecutive BIP39 mnemonic words in text content.
 * Returns violations where `threshold` or more consecutive BIP39 words appear on a single line.
 *
 * Tokens are stripped of surrounding punctuation (quotes, commas, brackets, etc.)
 * before matching. Interior punctuation (hyphens, apostrophes) still disqualifies a token.
 * Purely non-alphabetic tokens (like "1.", "2)", "//") are skipped without breaking a sequence.
 */
export function detectBip39Sequences(
  content: string,
  threshold: number = 5
): Bip39Violation[] {
  if (!content) return []

  const violations: Bip39Violation[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const tokens = line
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => t.toLowerCase())

    let consecutive = 0
    const matchedWords: string[] = []

    for (let j = 0; j < tokens.length; j++) {
      const stripped = stripToken(tokens[j])

      if (stripped === 'skip') {
        // Non-alpha token (numbering, punctuation) — don't break the sequence
        continue
      }

      if (stripped !== null && BIP39_WORDS.has(stripped)) {
        consecutive++
        matchedWords.push(stripped)
      } else {
        if (consecutive >= threshold) {
          violations.push({
            lineNumber: i + 1,
            matchedWords: matchedWords.slice(-consecutive),
            line: line,
          })
        }
        consecutive = 0
        matchedWords.length = 0
      }
    }

    // Check trailing sequence at end of line
    if (consecutive >= threshold) {
      violations.push({
        lineNumber: i + 1,
        matchedWords: matchedWords.slice(-consecutive),
        line: line,
      })
    }
  }

  return violations
}
