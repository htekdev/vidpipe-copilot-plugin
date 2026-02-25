import { describe, test, expect, vi, beforeEach } from 'vitest'

const mockExecFile = vi.fn()

vi.mock('node:child_process', () => ({
  execFile: mockExecFile,
}))

vi.mock('node:util', () => ({
  promisify: (fn: unknown) => fn,
}))

describe('extractClip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExecFile.mockResolvedValue({ stdout: '', stderr: '' })
  })

  test('builds correct FFmpeg args for clip extraction', async () => {
    const { extractClip } = await import('./extractClip.js')

    await extractClip('/input.mp4', {
      start: 10,
      end: 45,
      output: '/output.mp4',
    })

    expect(mockExecFile).toHaveBeenCalledWith(
      'ffmpeg',
      expect.arrayContaining([
        '-i', '/input.mp4',
        '-c:v', 'libx264',
      ]),
      expect.any(Object),
    )
  })

  test('applies buffer to start time', async () => {
    const { extractClip } = await import('./extractClip.js')

    await extractClip('/input.mp4', {
      start: 10,
      end: 45,
      output: '/output.mp4',
      buffer: 2,
    })

    // Start should be 10 - 2 = 8
    expect(mockExecFile).toHaveBeenCalledWith(
      'ffmpeg',
      expect.arrayContaining(['-ss', '8']),
      expect.any(Object),
    )
  })

  test('clamps buffer to zero for early starts', async () => {
    const { extractClip } = await import('./extractClip.js')

    await extractClip('/input.mp4', {
      start: 1,
      end: 45,
      output: '/output.mp4',
      buffer: 5,
    })

    // Start should be clamped to 0
    expect(mockExecFile).toHaveBeenCalledWith(
      'ffmpeg',
      expect.arrayContaining(['-ss', '0']),
      expect.any(Object),
    )
  })
})
