/**
 * Viral Content Generation Tools
 *
 * AI-powered shorts strategy and social media post generation.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

export interface ShortPlan {
  id: string
  title: string
  start: number
  end: number
  hook: string
  hookText: string // ≤60 chars for overlay
  topic: string
  engagementScore: number
  platforms: string[]
  tags: string[]
  isComposite: boolean
  segments?: Array<{ start: number; end: number }>
}

export interface ShortsStrategy {
  videoPath: string
  shorts: ShortPlan[]
  totalShorts: number
  coverageMinutes: number
}

export interface SocialPost {
  platform: string
  content: string
  hashtags: string[]
  characterCount: number
  mediaType: 'video' | 'image' | 'text'
}

const SHORTS_PLANNING_PROMPT = `You are a viral content strategist specializing in short-form video.

Analyze this transcript and plan short clips (15-60 seconds each) optimized for virality:

**STRATEGY: Hook-First (Z→A→B→C)**
Lead with the most exciting moment, then provide context. Viewers decide in 3 seconds.

**FOR EACH SHORT, PROVIDE:**
1. **ID**: unique slug (e.g., "ai-revolution-moment")
2. **Title**: compelling title for the clip
3. **Timestamps**: start and end times from the transcript
4. **Hook**: the attention-grabbing opening moment
5. **Hook Text**: ≤60 characters for on-screen overlay
6. **Topic**: main theme of the clip
7. **Engagement Score**: 1-100 predicted engagement
8. **Platforms**: which platforms it works best for (tiktok, youtube_shorts, instagram_reels)
9. **Tags**: 3-6 relevant lowercase tags without #

**CLIP TYPES TO IDENTIFY:**
- Key insights and revelations
- Surprising facts or controversial takes
- Emotional peaks (humor, inspiration, frustration)
- Before/after demonstrations
- Quick tips and how-tos
- Quotable moments

**OUTPUT RULES:**
- Generate 1 short per 2-3 minutes of content minimum
- Ensure comprehensive coverage - don't miss good moments
- Prioritize by engagement potential
- Mark composite clips (multi-segment) with isComposite: true

Return JSON:
\`\`\`json
{
  "shorts": [
    {
      "id": "clip-slug",
      "title": "Compelling Title",
      "start": 45.2,
      "end": 78.5,
      "hook": "The moment that grabs attention",
      "hookText": "This changes everything",
      "topic": "AI Development",
      "engagementScore": 85,
      "platforms": ["tiktok", "youtube_shorts"],
      "tags": ["ai", "coding", "tutorial"],
      "isComposite": false
    }
  ]
}
\`\`\`

TRANSCRIPT:
`

const SOCIAL_POST_PROMPT = `You are a social media expert. Generate platform-optimized posts for this video.

**PLATFORM CONSTRAINTS:**
- TikTok: 150 chars max, emoji-heavy, trending hashtags, casual tone
- YouTube: SEO title + description, searchable keywords
- Instagram: 2200 chars max, 30 hashtags max, visual storytelling
- LinkedIn: Professional thought-leadership, 3000 chars max, minimal hashtags
- X/Twitter: 280 chars max, thread-ready, conversation starters

**FOR EACH PLATFORM:**
1. Write platform-native copy (match the culture)
2. Include relevant hashtags (platform-appropriate count)
3. Call-to-action aligned with platform norms
4. Optimize for the algorithm (engagement triggers)

Return JSON array:
\`\`\`json
[
  {
    "platform": "tiktok",
    "content": "Post content here",
    "hashtags": ["ai", "coding", "tech"],
    "characterCount": 145,
    "mediaType": "video"
  }
]
\`\`\`

VIDEO CONTEXT:
`

/**
 * Plan short clips from a video transcript
 */
export async function planShorts(
  videoPath: string,
  transcript: TranscriptSegment[],
): Promise<ShortsStrategy> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? 'gemini-2.5-pro' })

  // Format transcript for prompt
  const transcriptText = transcript
    .map(seg => `[${formatTimestamp(seg.start)} - ${formatTimestamp(seg.end)}] ${seg.text}`)
    .join('\n')

  const totalMinutes = transcript.length > 0
    ? (transcript[transcript.length - 1].end - transcript[0].start) / 60
    : 0

  const result = await model.generateContent(SHORTS_PLANNING_PROMPT + transcriptText)
  const response = result.response.text()

  // Parse JSON from response
  const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/)
  let shorts: ShortPlan[] = []

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      shorts = parsed.shorts ?? []
    } catch {
      // Parsing failed
    }
  }

  return {
    videoPath,
    shorts,
    totalShorts: shorts.length,
    coverageMinutes: totalMinutes,
  }
}

/**
 * Generate platform-specific social media posts
 */
export async function generatePosts(
  videoPath: string,
  platforms: string[],
): Promise<SocialPost[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? 'gemini-2.5-pro' })
  const fileManager = genAI.getFileManager()

  // Upload video for context
  const uploadResult = await fileManager.uploadFile(videoPath, {
    mimeType: 'video/mp4',
  })

  // Wait for processing
  let file = uploadResult.file
  while (file.state === ('PROCESSING' as unknown)) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    const getResult = await fileManager.getFile(file.name)
    file = getResult
  }

  const platformList = platforms.join(', ')
  const prompt = SOCIAL_POST_PROMPT + `Generate posts for: ${platformList}`

  const result = await model.generateContent([
    { text: prompt },
    { fileData: { mimeType: 'video/mp4', fileUri: file.uri } },
  ])

  const response = result.response.text()

  // Parse JSON from response
  const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/)
  let posts: SocialPost[] = []

  if (jsonMatch) {
    try {
      posts = JSON.parse(jsonMatch[1])
    } catch {
      // Parsing failed
    }
  }

  return posts.filter(p => platforms.includes(p.platform.toLowerCase()))
}

/**
 * Format seconds as MM:SS timestamp
 */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
