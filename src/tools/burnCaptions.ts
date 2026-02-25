/**
 * Caption Burning Tool
 *
 * Hard-code ASS/SRT subtitles into video using FFmpeg subtitle filter.
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { copyFile, rm, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, basename } from 'node:path'

const execFileAsync = promisify(execFile)

export interface CaptionOptions {
  /** Path to ASS/SRT caption file */
  captionsFile: string
  /** Output file path */
  output: string
  /** Font directory for ASS styles (optional) */
  fontsDir?: string
}

/**
 * Burn captions into video
 *
 * Handles Windows drive-letter colon issues by copying to temp directory.
 */
export async function burnCaptions(videoPath: string, options: CaptionOptions): Promise<void> {
  const ffmpegPath = process.env.FFMPEG_PATH ?? 'ffmpeg'
  const { captionsFile, output, fontsDir } = options

  // On Windows, ASS filter has issues with colons in paths
  // Copy files to temp directory to work around this
  const tempDir = join(tmpdir(), `vidpipe-captions-${Date.now()}`)
  await mkdir(tempDir, { recursive: true })

  try {
    const tempCaptions = join(tempDir, basename(captionsFile))
    await copyFile(captionsFile, tempCaptions)

    // Build subtitle filter
    const isAss = captionsFile.toLowerCase().endsWith('.ass')
    let subtitleFilter: string

    if (isAss) {
      // ASS filter with fonts directory
      const fontsDirOption = fontsDir ? `:fontsdir=${fontsDir}` : ':fontsdir=.'
      subtitleFilter = `ass=${basename(tempCaptions)}${fontsDirOption}`
    } else {
      // SRT/other formats use subtitles filter
      subtitleFilter = `subtitles=${basename(tempCaptions)}`
    }

    const args = [
      '-y',
      '-i', videoPath,
      '-vf', subtitleFilter,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'copy',
      output,
    ]

    await execFileAsync(ffmpegPath, args, {
      cwd: tempDir,
      maxBuffer: 50 * 1024 * 1024,
    })
  } finally {
    // Cleanup temp directory
    await rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}

/**
 * Combined silence removal and caption burning in single pass
 *
 * More efficient than running both operations separately.
 */
export async function singlePassEditAndCaption(
  videoPath: string,
  keepRegions: Array<{ start: number; end: number }>,
  captionsFile: string,
  output: string,
): Promise<void> {
  const ffmpegPath = process.env.FFMPEG_PATH ?? 'ffmpeg'

  // Setup temp directory for caption file
  const tempDir = join(tmpdir(), `vidpipe-captions-${Date.now()}`)
  await mkdir(tempDir, { recursive: true })

  try {
    const tempCaptions = join(tempDir, basename(captionsFile))
    await copyFile(captionsFile, tempCaptions)

    // Build trim filters
    const trimFilters: string[] = []
    const concatInputs: string[] = []

    for (let i = 0; i < keepRegions.length; i++) {
      const region = keepRegions[i]
      trimFilters.push(`[0:v]trim=start=${region.start}:end=${region.end},setpts=PTS-STARTPTS[v${i}]`)
      trimFilters.push(`[0:a]atrim=start=${region.start}:end=${region.end},asetpts=PTS-STARTPTS[a${i}]`)
      concatInputs.push(`[v${i}][a${i}]`)
    }

    // Concat then apply captions
    const isAss = captionsFile.toLowerCase().endsWith('.ass')
    const subtitleFilter = isAss
      ? `ass=${basename(tempCaptions)}:fontsdir=.`
      : `subtitles=${basename(tempCaptions)}`

    const filterComplex = [
      ...trimFilters,
      `${concatInputs.join('')}concat=n=${keepRegions.length}:v=1:a=1[concatv][concata]`,
      `[concatv]${subtitleFilter}[outv]`,
    ].join(';')

    const args = [
      '-y',
      '-i', videoPath,
      '-filter_complex', filterComplex,
      '-map', '[outv]',
      '-map', '[concata]',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      output,
    ]

    await execFileAsync(ffmpegPath, args, {
      cwd: tempDir,
      maxBuffer: 50 * 1024 * 1024,
    })
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}
