/**
 * Video Clip Extraction Tool
 *
 * Frame-accurate clip extraction using FFmpeg with smart keyframe handling.
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface ClipOptions {
  start: number
  end: number
  output: string
  /** Buffer in seconds to add before/after for keyframe safety (default: 1) */
  buffer?: number
}

/**
 * Extract a clip from video using FFmpeg
 *
 * Uses re-encoding for frame-accurate cuts (not -c copy which depends on keyframes).
 */
export async function extractClip(videoPath: string, options: ClipOptions): Promise<void> {
  const { start, end, output, buffer = 1 } = options
  const ffmpegPath = process.env.FFMPEG_PATH ?? 'ffmpeg'

  // Calculate actual start with buffer (clamped to 0)
  const actualStart = Math.max(0, start - buffer)
  const duration = end - start + buffer * 2

  const args = [
    '-y',
    '-ss', actualStart.toString(),
    '-i', videoPath,
    '-t', duration.toString(),
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    output,
  ]

  await execFileAsync(ffmpegPath, args, { maxBuffer: 50 * 1024 * 1024 })
}

/**
 * Extract multiple non-contiguous segments and concatenate them
 */
export async function extractCompositeClip(
  videoPath: string,
  segments: Array<{ start: number; end: number }>,
  output: string,
  transitionDuration = 0.5,
): Promise<void> {
  const ffmpegPath = process.env.FFMPEG_PATH ?? 'ffmpeg'

  if (segments.length === 0) {
    throw new Error('At least one segment is required')
  }

  if (segments.length === 1) {
    // Single segment, use simple extraction
    return extractClip(videoPath, {
      start: segments[0].start,
      end: segments[0].end,
      output,
    })
  }

  // Build complex filter for multiple segments with crossfade transitions
  const filterParts: string[] = []
  const inputPads: string[] = []

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const duration = seg.end - seg.start
    filterParts.push(`[0:v]trim=start=${seg.start}:end=${seg.end},setpts=PTS-STARTPTS[v${i}]`)
    filterParts.push(`[0:a]atrim=start=${seg.start}:end=${seg.end},asetpts=PTS-STARTPTS[a${i}]`)
    inputPads.push(`[v${i}][a${i}]`)
  }

  // Chain xfade transitions
  let currentVideo = 'v0'
  let currentAudio = 'a0'

  for (let i = 1; i < segments.length; i++) {
    const prevDuration = segments[i - 1].end - segments[i - 1].start
    const offset = prevDuration - transitionDuration

    const nextVideo = i === segments.length - 1 ? 'vout' : `vt${i}`
    const nextAudio = i === segments.length - 1 ? 'aout' : `at${i}`

    filterParts.push(`[${currentVideo}][v${i}]xfade=transition=fade:duration=${transitionDuration}:offset=${offset}[${nextVideo}]`)
    filterParts.push(`[${currentAudio}][a${i}]acrossfade=d=${transitionDuration}[${nextAudio}]`)

    currentVideo = nextVideo
    currentAudio = nextAudio
  }

  const filterComplex = filterParts.join(';')

  const args = [
    '-y',
    '-i', videoPath,
    '-filter_complex', filterComplex,
    '-map', '[vout]',
    '-map', '[aout]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    output,
  ]

  await execFileAsync(ffmpegPath, args, { maxBuffer: 50 * 1024 * 1024 })
}
