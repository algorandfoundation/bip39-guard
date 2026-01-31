import { describe, it, expect } from 'vitest'
import { scanFiles } from './scan-repo'
import { mkdtempSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'bip39-scan-'))
}

describe('scanFiles', () => {
  it('detects seed phrase in a file', () => {
    const dir = makeTempDir()
    writeFileSync(join(dir, 'secrets.txt'), 'abandon ability able about above')
    const result = scanFiles([join(dir, 'secrets.txt')])
    expect(result).toHaveLength(1)
    expect(result[0].file).toContain('secrets.txt')
    expect(result[0].matchedWords).toHaveLength(5)
  })

  it('returns empty for clean files', () => {
    const dir = makeTempDir()
    writeFileSync(join(dir, 'clean.txt'), 'hello world this is fine')
    const result = scanFiles([join(dir, 'clean.txt')])
    expect(result).toEqual([])
  })

  it('scans multiple files', () => {
    const dir = makeTempDir()
    writeFileSync(join(dir, 'a.txt'), 'abandon ability able about above')
    writeFileSync(join(dir, 'b.txt'), 'normal content here')
    writeFileSync(join(dir, 'c.txt'), 'zoo zone zero youth young you')
    const result = scanFiles([
      join(dir, 'a.txt'),
      join(dir, 'b.txt'),
      join(dir, 'c.txt'),
    ])
    expect(result).toHaveLength(2)
  })

  it('respects custom threshold', () => {
    const dir = makeTempDir()
    writeFileSync(join(dir, 'test.txt'), 'abandon ability able about above')
    expect(scanFiles([join(dir, 'test.txt')], 6)).toEqual([])
    expect(scanFiles([join(dir, 'test.txt')], 5)).toHaveLength(1)
  })

  it('skips binary files gracefully', () => {
    const dir = makeTempDir()
    const buf = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe])
    writeFileSync(join(dir, 'binary.bin'), buf)
    const result = scanFiles([join(dir, 'binary.bin')])
    expect(result).toEqual([])
  })
})
