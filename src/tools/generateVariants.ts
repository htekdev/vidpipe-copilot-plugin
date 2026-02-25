/**
 * Platform Variant Generator
 *
 * Generate multi-platform aspect ratio variants for social media distribution.
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir } from 'node:fs/promises'
import { join, basename } from 'node:path'

const execFileAsync = promisify(execFile)

export type Platform = 'tiktok' | 'youtube' | 'instagram' | 'linkedin' | 'twitter'

export interface VariantOptions {
  platforms: Platform[] | string[]
  outputDir: string
}

interface AspectRatio {
  width: number
  height: number
  name: string
}

const PLATFORM_ASPECT_RATIOS: Record<Platform, AspectRatio[]> = {
  tiktok: [{ width: 9, height: 16, name: 'portrait' }],
  youtube: [
    { width: 16, height: 9, name: 'landscape' },
    { width: 9, height: 16, name: 'shorts' },
  ],
  instagram: [
    { width: 9, height: 16, name: 'reels' },
    { width: 1, height: 1, name: 'square' },
    { width: 4, height: 5, name: 'feed' },
  ],
  linkedin: [
    { width: 16, height: 9, name: 'landscape' },
    { width: 1, height: 1, name: 'square' },
  ],
  twitter: [
    { width: 16, height: 9, name: 'landscape' },
    { width: 1, height: 1, name: 'square' },
  ],
}

/**
 * Get video resolution using ffprobe
 */
async function getVideoResolution(videoPath: string): Promise<{ width: number; height: number }> {
  const ffprobePath = process.env.FFPROBE_PATH ?? 'ffprobe'

  const { stdout } = await execFileAsync(ffprobePath, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height',
    '-of', 'json',
    videoPath,
  ])

  const data = JSON.parse(stdout)
  return {
    width: data.streams[0].width,
    height: data.streams[0].height,
  }
}

/**
 * Generate a single variant with specified aspect ratio
 */
async function generateVariant(
  videoPath: string,
  aspectRatio: AspectRatio,
  outputPath: string,
): Promise<void> {
  const ffmpegPath = process.env.FFMPEG_PATH ?? 'ffmpeg'

  const { width: srcWidth, height: srcHeight } = await getVideoResolution(videoPath)
  const srcAspect = srcWidth / srcHeight
  const targetAspect = aspectRatio.width / aspectRatio.height

  let filter: string
  let outputWidth: number
  let outputHeight: number

  if (Math.abs(srcAspect - targetAspect) < 0.01) {
    // Same aspect ratio, just scale
    outputWidth = srcWidth
    outputHeight = srcHeight
    filter = 'copy'
  } else if (srcAspect > targetAspect) {
    // Source is wider, crop sides
    outputHeight = srcHeight
    outputWidth = Math.round(srcHeight * targetAspect)
    const cropX = Math.round((srcWidth - outputWidth) / 2)
    filter = `crop=${outputWidth}:${outputHeight}:${cropX}:0`
  } else {
    // Source is taller, crop top/bottom
    outputWidth = srcWidth
    outputHeight = Math.round(srcWidth / targetAspect)
    const cropY = Math.round((srcHeight - outputHeight) / 2)
    filter = `crop=${outputWidth}:${outputHeight}:0:${cropY}`
  }

  const args = [
    '-y',
    '-i', videoPath,
    ...(filter === 'copy' ? ['-c', 'copy'] : ['-vf', filter, '-c:v', 'libx264', '-preset', 'fast', '-crf', '23']),
    '-c:a', 'copy',
    outputPath,
  ]

  await execFileAsync(ffmpegPath, args, { maxBuffer: 50 * 1024 * 1024 })
}

/**
 * Generate platform-specific variants for a video
 */
export async function generateVariants(videoPath: string, options: VariantOptions): Promise<string[]> {
  const { platforms, outputDir } = options
  await mkdir(outputDir, { recursive: true })

  const baseName = basename(videoPath, '.mp4')
  const outputs: string[] = []
  const generated = new Set<string>() // Avoid duplicate aspect ratios

  for (const platform of platforms as Platform[]) {
    const ratios = PLATFORM_ASPECT_RATIOS[platform]
    if (!ratios) continue

    for (const ratio of ratios) {
      const key = `${ratio.width}x${ratio.height}`
      if (generated.has(key)) continue
      generated.add(key)

      const outputPath = join(outputDir, `${baseName}_${ratio.name}_${ratio.width}x${ratio.height}.mp4`)
      await generateVariant(videoPath, ratio, outputPath)
      outputs.push(outputPath)
    }
  }

  return outputs
}
