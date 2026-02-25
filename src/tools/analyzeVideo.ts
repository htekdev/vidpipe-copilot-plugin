/**
 * Gemini Video Analysis Tool
 *
 * Provides three types of AI-powered video analysis:
 * - Editorial: Cut points, transitions, pacing, hooks
 * - Clips: Short (15-60s) and medium (60-180s) clip identification
 * - Enhancements: Overlay and diagram suggestions
 */

import { GoogleGenerativeAI, type FileState } from '@google/generative-ai'

export type AnalysisType = 'editorial' | 'clips' | 'enhancements'

export interface EditorialCut {
  timestamp: number
  type: 'cut' | 'transition'
  transitionStyle?: 'hard' | 'crossfade' | 'dissolve' | 'j-cut' | 'l-cut'
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export interface ShortClip {
  id: string
  start: number
  end: number
  hook: string
  topic: string
  engagementScore: number
  platforms: string[]
  tags: string[]
}

export interface MediumClip {
  id: string
  start: number
  end: number
  narrative: string
  standaloneScore: number
  keyMoments: number[]
}

export interface EnhancementSuggestion {
  timestamp: number
  duration: number
  type: 'diagram' | 'flowchart' | 'infographic' | 'code-visual'
  description: string
  placement: { x: string; y: string }
  avoidRegion?: { x: number; y: number; width: number; height: number }
}

export interface AnalysisResult {
  type: AnalysisType
  videoPath: string
  analysis: string
  cuts?: EditorialCut[]
  shorts?: ShortClip[]
  mediumClips?: MediumClip[]
  enhancements?: EnhancementSuggestion[]
}

const EDITORIAL_PROMPT = `You are a professional video editor. Analyze this video and provide:

1. **Cut Points**: Identify timestamps where cuts should occur
2. **Transitions**: Recommend transition types (hard cut, crossfade, dissolve, J-cut, L-cut)
3. **Pacing Analysis**: Identify slow/fast sections and dead air
4. **Hook Rating**: Rate the opening hook (1-10) and suggest improvements
5. **Structure**: Break down intro/body/outro with timestamps

Return your analysis as markdown, followed by a JSON block with cut points:
\`\`\`json
{
  "cuts": [
    { "timestamp": 10.5, "type": "cut", "confidence": "high", "reason": "Topic change" }
  ]
}
\`\`\``

const CLIPS_PROMPT = `You are a viral content strategist. Analyze this video to identify:

**SHORT CLIPS (15-60 seconds)**:
- Identify 3-8 potential short clips for TikTok, YouTube Shorts, Instagram Reels
- Rate each clip's engagement potential (1-100)
- Suggest hook text (≤60 chars) for each
- List relevant hashtags (3-6 per clip)

**MEDIUM CLIPS (60-180 seconds)**:
- Identify 2-4 standalone narrative arcs
- Rate standalone value (1-100)
- Note key visual moments for emphasis

Use hook-first strategy (Z→A→B→C pattern) — lead with the most exciting moment.

Return as markdown analysis + JSON:
\`\`\`json
{
  "shorts": [{ "id": "short-1", "start": 0, "end": 45, "hook": "...", "engagementScore": 85 }],
  "mediumClips": [{ "id": "medium-1", "start": 0, "end": 120, "narrative": "...", "standaloneScore": 75 }]
}
\`\`\``

const ENHANCEMENTS_PROMPT = `You are a visual communication expert. Analyze this video to identify moments where AI-generated overlays would improve comprehension:

For each suggestion:
1. **Timestamp and duration**: When to show the overlay
2. **Type**: diagram, flowchart, infographic, or code-visual
3. **Description**: What the overlay should depict
4. **Placement**: Where to position (avoid blocking webcam/important content)

Consider the screen layout (webcam position, code editors, etc.) when suggesting placement.

Return as markdown + JSON:
\`\`\`json
{
  "enhancements": [
    { "timestamp": 30, "duration": 5, "type": "diagram", "description": "...", "placement": { "x": "right", "y": "center" } }
  ]
}
\`\`\``

/**
 * Analyze a video file using Gemini AI
 */
export async function analyzeVideo(videoPath: string, type: AnalysisType = 'editorial'): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? 'gemini-2.5-pro' })
  const fileManager = genAI.getFileManager()

  // Upload video to Gemini Files API
  const uploadResult = await fileManager.uploadFile(videoPath, {
    mimeType: 'video/mp4',
  })

  // Wait for video processing
  let file = uploadResult.file
  while (file.state === 'PROCESSING' as FileState) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    const getResult = await fileManager.getFile(file.name)
    file = getResult
  }

  if (file.state === 'FAILED' as FileState) {
    throw new Error(`Video processing failed: ${file.name}`)
  }

  // Select prompt based on analysis type
  const prompts: Record<AnalysisType, string> = {
    editorial: EDITORIAL_PROMPT,
    clips: CLIPS_PROMPT,
    enhancements: ENHANCEMENTS_PROMPT,
  }

  // Generate analysis
  const result = await model.generateContent([
    { text: prompts[type] },
    { fileData: { mimeType: 'video/mp4', fileUri: file.uri } },
  ])

  const response = result.response.text()

  // Parse JSON from response
  const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/)
  let parsed: Record<string, unknown> = {}
  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[1])
    } catch {
      // JSON parsing failed, continue with text-only result
    }
  }

  return {
    type,
    videoPath,
    analysis: response,
    cuts: parsed.cuts as EditorialCut[] | undefined,
    shorts: parsed.shorts as ShortClip[] | undefined,
    mediumClips: parsed.mediumClips as MediumClip[] | undefined,
    enhancements: parsed.enhancements as EnhancementSuggestion[] | undefined,
  }
}
