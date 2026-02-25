import { describe, test, expect, vi } from 'vitest'

// Mock the Google Generative AI module
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => `Analysis complete.
\`\`\`json
{
  "cuts": [
    { "timestamp": 10.5, "type": "cut", "confidence": "high", "reason": "Topic change" }
  ]
}
\`\`\``,
        },
      }),
    }),
    getFileManager: vi.fn().mockReturnValue({
      uploadFile: vi.fn().mockResolvedValue({
        file: { name: 'test-file', uri: 'gs://test', state: 'ACTIVE' },
      }),
      getFile: vi.fn().mockResolvedValue({
        name: 'test-file',
        uri: 'gs://test',
        state: 'ACTIVE',
      }),
    }),
  })),
}))

describe('analyzeVideo', () => {
  test('parses editorial analysis JSON from response', async () => {
    // Set API key for test
    process.env.GEMINI_API_KEY = 'test-key'

    const { analyzeVideo } = await import('./analyzeVideo.js')
    const result = await analyzeVideo('/tmp/test.mp4', 'editorial')

    expect(result.type).toBe('editorial')
    expect(result.videoPath).toBe('/tmp/test.mp4')
    expect(result.cuts).toBeDefined()
    expect(result.cuts).toHaveLength(1)
    expect(result.cuts![0].timestamp).toBe(10.5)
    expect(result.cuts![0].confidence).toBe('high')
  })

  test('throws when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY

    const { analyzeVideo } = await import('./analyzeVideo.js')
    await expect(analyzeVideo('/tmp/test.mp4')).rejects.toThrow('GEMINI_API_KEY')
  })
})
