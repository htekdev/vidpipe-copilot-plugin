/**
 * MCP Server for vidpipe-copilot-plugin
 *
 * Exposes video editing tools via Model Context Protocol for Copilot integration.
 */

import { createInterface } from 'node:readline'
import { analyzeVideo } from '../tools/analyzeVideo.js'
import { extractClip, extractCompositeClip } from '../tools/extractClip.js'
import { removeSilence, detectSilence } from '../tools/removeSilence.js'
import { burnCaptions } from '../tools/burnCaptions.js'
import { generateVariants } from '../tools/generateVariants.js'
import { planShorts, generatePosts } from '../tools/viralContent.js'

interface McpRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, unknown>
}

interface McpResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

const TOOLS = [
  {
    name: 'analyze_video',
    description: 'Analyze video with Gemini AI for editorial direction, clip opportunities, or enhancement suggestions',
    inputSchema: {
      type: 'object',
      properties: {
        videoPath: { type: 'string', description: 'Path to the video file' },
        type: { type: 'string', enum: ['editorial', 'clips', 'enhancements'], description: 'Type of analysis' },
      },
      required: ['videoPath'],
    },
  },
  {
    name: 'extract_clip',
    description: 'Extract a clip from video using FFmpeg with frame-accurate cutting',
    inputSchema: {
      type: 'object',
      properties: {
        videoPath: { type: 'string', description: 'Path to the video file' },
        start: { type: 'number', description: 'Start time in seconds' },
        end: { type: 'number', description: 'End time in seconds' },
        output: { type: 'string', description: 'Output file path' },
      },
      required: ['videoPath', 'start', 'end', 'output'],
    },
  },
  {
    name: 'extract_composite_clip',
    description: 'Extract multiple non-contiguous segments and concatenate with transitions',
    inputSchema: {
      type: 'object',
      properties: {
        videoPath: { type: 'string', description: 'Path to the video file' },
        segments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              start: { type: 'number' },
              end: { type: 'number' },
            },
            required: ['start', 'end'],
          },
          description: 'Array of segments to extract',
        },
        output: { type: 'string', description: 'Output file path' },
        transitionDuration: { type: 'number', description: 'Crossfade duration in seconds (default: 0.5)' },
      },
      required: ['videoPath', 'segments', 'output'],
    },
  },
  {
    name: 'detect_silence',
    description: 'Detect silent regions in video audio',
    inputSchema: {
      type: 'object',
      properties: {
        videoPath: { type: 'string', description: 'Path to the video file' },
        threshold: { type: 'string', description: 'Silence threshold in dB (default: -30dB)' },
        minDuration: { type: 'number', description: 'Minimum silence duration in seconds (default: 0.5)' },
      },
      required: ['videoPath'],
    },
  },
  {
    name: 'remove_silence',
    description: 'Remove silent regions from video',
    inputSchema: {
      type: 'object',
      properties: {
        videoPath: { type: 'string', description: 'Path to the video file' },
        threshold: { type: 'string', description: 'Silence threshold in dB (default: -30dB)' },
        minDuration: { type: 'number', description: 'Minimum silence duration in seconds (default: 0.5)' },
        output: { type: 'string', description: 'Output file path' },
      },
      required: ['videoPath', 'output'],
    },
  },
  {
    name: 'burn_captions',
    description: 'Hard-code ASS/SRT subtitles into video',
    inputSchema: {
      type: 'object',
      properties: {
        videoPath: { type: 'string', description: 'Path to the video file' },
        captionsFile: { type: 'string', description: 'Path to ASS/SRT caption file' },
        output: { type: 'string', description: 'Output file path' },
      },
      required: ['videoPath', 'captionsFile', 'output'],
    },
  },
  {
    name: 'generate_variants',
    description: 'Generate platform-specific aspect ratio variants (16:9, 9:16, 1:1, 4:5)',
    inputSchema: {
      type: 'object',
      properties: {
        videoPath: { type: 'string', description: 'Path to the video file' },
        platforms: {
          type: 'array',
          items: { type: 'string', enum: ['tiktok', 'youtube', 'instagram', 'linkedin', 'twitter'] },
          description: 'Target platforms',
        },
        outputDir: { type: 'string', description: 'Output directory' },
      },
      required: ['videoPath', 'platforms', 'outputDir'],
    },
  },
  {
    name: 'plan_shorts',
    description: 'AI-powered shorts strategy with hooks and engagement scoring',
    inputSchema: {
      type: 'object',
      properties: {
        videoPath: { type: 'string', description: 'Path to the video file' },
        transcript: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              start: { type: 'number' },
              end: { type: 'number' },
              text: { type: 'string' },
            },
            required: ['start', 'end', 'text'],
          },
          description: 'Transcript segments',
        },
      },
      required: ['videoPath', 'transcript'],
    },
  },
  {
    name: 'generate_posts',
    description: 'Generate platform-specific social media posts',
    inputSchema: {
      type: 'object',
      properties: {
        videoPath: { type: 'string', description: 'Path to the video file' },
        platforms: {
          type: 'array',
          items: { type: 'string', enum: ['tiktok', 'youtube', 'instagram', 'linkedin', 'twitter'] },
          description: 'Target platforms',
        },
      },
      required: ['videoPath', 'platforms'],
    },
  },
]

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'analyze_video':
      return analyzeVideo(args.videoPath as string, (args.type as 'editorial' | 'clips' | 'enhancements') ?? 'editorial')

    case 'extract_clip':
      await extractClip(args.videoPath as string, {
        start: args.start as number,
        end: args.end as number,
        output: args.output as string,
      })
      return { success: true, output: args.output }

    case 'extract_composite_clip':
      await extractCompositeClip(
        args.videoPath as string,
        args.segments as Array<{ start: number; end: number }>,
        args.output as string,
        args.transitionDuration as number | undefined,
      )
      return { success: true, output: args.output }

    case 'detect_silence':
      return detectSilence(args.videoPath as string, {
        threshold: args.threshold as string | undefined,
        minDuration: args.minDuration as number | undefined,
        output: '',
      })

    case 'remove_silence':
      await removeSilence(args.videoPath as string, {
        threshold: args.threshold as string | undefined,
        minDuration: args.minDuration as number | undefined,
        output: args.output as string,
      })
      return { success: true, output: args.output }

    case 'burn_captions':
      await burnCaptions(args.videoPath as string, {
        captionsFile: args.captionsFile as string,
        output: args.output as string,
      })
      return { success: true, output: args.output }

    case 'generate_variants':
      return generateVariants(args.videoPath as string, {
        platforms: args.platforms as string[],
        outputDir: args.outputDir as string,
      })

    case 'plan_shorts':
      return planShorts(
        args.videoPath as string,
        args.transcript as Array<{ start: number; end: number; text: string }>,
      )

    case 'generate_posts':
      return generatePosts(args.videoPath as string, args.platforms as string[])

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

function respond(response: McpResponse): void {
  console.log(JSON.stringify(response))
}

async function handleRequest(request: McpRequest): Promise<void> {
  try {
    switch (request.method) {
      case 'initialize':
        respond({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'vidpipe-copilot-plugin', version: '0.1.0' },
          },
        })
        break

      case 'tools/list':
        respond({
          jsonrpc: '2.0',
          id: request.id,
          result: { tools: TOOLS },
        })
        break

      case 'tools/call': {
        const { name, arguments: args } = request.params as { name: string; arguments: Record<string, unknown> }
        const result = await handleToolCall(name, args)
        respond({
          jsonrpc: '2.0',
          id: request.id,
          result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
        })
        break
      }

      default:
        respond({
          jsonrpc: '2.0',
          id: request.id,
          error: { code: -32601, message: `Method not found: ${request.method}` },
        })
    }
  } catch (err) {
    respond({
      jsonrpc: '2.0',
      id: request.id,
      error: { code: -32000, message: err instanceof Error ? err.message : String(err) },
    })
  }
}

export async function startMcpServer(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false })

  rl.on('line', async (line) => {
    try {
      const request = JSON.parse(line) as McpRequest
      await handleRequest(request)
    } catch {
      // Invalid JSON, ignore
    }
  })

  // Keep process alive
  await new Promise(() => {})
}
