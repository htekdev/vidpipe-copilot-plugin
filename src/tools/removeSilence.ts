/**
 * Silence Removal Tool
 *
 * Detect and remove silent regions from video using FFmpeg silencedetect filter.
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface SilenceOptions {
  /** Silence threshold in dB (default: -30dB) */
  threshold?: string
  /** Minimum silence duration in seconds (default: 0.5) */
  minDuration?: number
  /** Output file path */
  output: string
}

export interface SilentRegion {
  start: number
  end: number
  duration: number
}

/**
 * Detect silent regions in audio
 */
export async function detectSilence(videoPath: string, options: SilenceOptions): Promise<SilentRegion[]> {
  const ffmpegPath = process.env.FFMPEG_PATH ?? 'ffmpeg'
  const threshold = options.threshold ?? '-30dB'
  const minDuration = options.minDuration ?? 0.5

  const args = [
    '-i', videoPath,
    '-af', `silencedetect=noise=${threshold}:d=${minDuration}`,
    '-f', 'null',
    '-',
  ]

  const { stderr } = await execFileAsync(ffmpegPath, args, { maxBuffer: 50 * 1024 * 1024 })

  // Parse silencedetect output
  const regions: SilentRegion[] = []
  const lines = stderr.split('\n')

  let currentStart: number | null = null
  for (const line of lines) {
    const startMatch = line.match(/silence_start: ([\d.]+)/)
    const endMatch = line.match(/silence_end: ([\d.]+)/)

    if (startMatch) {
      currentStart = parseFloat(startMatch[1])
    } else if (endMatch && currentStart !== null) {
      const end = parseFloat(endMatch[1])
      regions.push({
        start: currentStart,
        end,
        duration: end - currentStart,
      })
      currentStart = null
    }
  }

  return regions
}

/**
 * Remove silent regions from video using single-pass trim filter
 */
export async function removeSilence(videoPath: string, options: SilenceOptions): Promise<void> {
  const ffmpegPath = process.env.FFMPEG_PATH ?? 'ffmpeg'
  const { output } = options

  // First detect silent regions
  const silentRegions = await detectSilence(videoPath, options)

  if (silentRegions.length === 0) {
    // No silence detected, just copy
    const args = ['-y', '-i', videoPath, '-c', 'copy', output]
    await execFileAsync(ffmpegPath, args)
    return
  }

  // Get video duration
  const { stdout } = await execFileAsync(
    process.env.FFPROBE_PATH ?? 'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', videoPath],
  )
  const totalDuration = parseFloat(stdout.trim())

  // Calculate keep regions (inverse of silent regions)
  const keepRegions: Array<{ start: number; end: number }> = []
  let cursor = 0

  for (const silent of silentRegions) {
    if (silent.start > cursor) {
      keepRegions.push({ start: cursor, end: silent.start })
    }
    cursor = silent.end
  }

  if (cursor < totalDuration) {
    keepRegions.push({ start: cursor, end: totalDuration })
  }

  if (keepRegions.length === 0) {
    throw new Error('Video is entirely silent')
  }

  // Build filter_complex for single-pass edit
  const trimFilters: string[] = []
  const concatInputs: string[] = []

  for (let i = 0; i < keepRegions.length; i++) {
    const region = keepRegions[i]
    trimFilters.push(`[0:v]trim=start=${region.start}:end=${region.end},setpts=PTS-STARTPTS[v${i}]`)
    trimFilters.push(`[0:a]atrim=start=${region.start}:end=${region.end},asetpts=PTS-STARTPTS[a${i}]`)
    concatInputs.push(`[v${i}][a${i}]`)
  }

  const filterComplex = [
    ...trimFilters,
    `${concatInputs.join('')}concat=n=${keepRegions.length}:v=1:a=1[outv][outa]`,
  ].join(';')

  const args = [
    '-y',
    '-i', videoPath,
    '-filter_complex', filterComplex,
    '-map', '[outv]',
    '-map', '[outa]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    output,
  ]

  await execFileAsync(ffmpegPath, args, { maxBuffer: 50 * 1024 * 1024 })
}
