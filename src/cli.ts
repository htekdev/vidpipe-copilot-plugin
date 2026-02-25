#!/usr/bin/env node
/**
 * CLI entry point for vidpipe-copilot-plugin
 */

import { Command } from 'commander'
import { analyzeVideo } from './tools/analyzeVideo.js'
import { extractClip } from './tools/extractClip.js'
import { removeSilence } from './tools/removeSilence.js'
import { burnCaptions } from './tools/burnCaptions.js'
import { generateVariants } from './tools/generateVariants.js'
import { planShorts, generatePosts } from './tools/viralContent.js'

const program = new Command()

program
  .name('vidpipe')
  .description('AI-powered video editing tools for GitHub Copilot')
  .version('0.1.0')

// Analyze command
program
  .command('analyze <video>')
  .description('Analyze video with Gemini AI')
  .option('-t, --type <type>', 'Analysis type: editorial, clips, enhancements', 'editorial')
  .option('-o, --output <file>', 'Output JSON file')
  .action(async (video, options) => {
    const result = await analyzeVideo(video, options.type)
    if (options.output) {
      const fs = await import('node:fs/promises')
      await fs.writeFile(options.output, JSON.stringify(result, null, 2))
      console.log(`Analysis saved to ${options.output}`)
    } else {
      console.log(JSON.stringify(result, null, 2))
    }
  })

// Cut command
program
  .command('cut <video>')
  .description('Extract a clip from video')
  .requiredOption('-s, --start <seconds>', 'Start time in seconds')
  .requiredOption('-e, --end <seconds>', 'End time in seconds')
  .option('-o, --output <file>', 'Output file path')
  .action(async (video, options) => {
    const output = options.output ?? video.replace(/\.mp4$/, '_clip.mp4')
    await extractClip(video, {
      start: parseFloat(options.start),
      end: parseFloat(options.end),
      output,
    })
    console.log(`Clip saved to ${output}`)
  })

// Silence removal command
program
  .command('silence-remove <video>')
  .description('Remove silent regions from video')
  .option('-t, --threshold <dB>', 'Silence threshold in dB', '-30')
  .option('-d, --duration <seconds>', 'Minimum silence duration', '0.5')
  .option('-o, --output <file>', 'Output file path')
  .action(async (video, options) => {
    const output = options.output ?? video.replace(/\.mp4$/, '_nosilence.mp4')
    await removeSilence(video, {
      threshold: options.threshold,
      minDuration: parseFloat(options.duration),
      output,
    })
    console.log(`Cleaned video saved to ${output}`)
  })

// Caption burning command
program
  .command('burn-captions <video>')
  .description('Burn subtitles into video')
  .requiredOption('-c, --captions <file>', 'ASS/SRT caption file')
  .option('-o, --output <file>', 'Output file path')
  .action(async (video, options) => {
    const output = options.output ?? video.replace(/\.mp4$/, '_captioned.mp4')
    await burnCaptions(video, {
      captionsFile: options.captions,
      output,
    })
    console.log(`Captioned video saved to ${output}`)
  })

// Platform variants command
program
  .command('variants <video>')
  .description('Generate platform-specific aspect ratio variants')
  .option('-p, --platforms <list>', 'Platforms: tiktok,youtube,instagram,linkedin,twitter', 'all')
  .option('-o, --output-dir <dir>', 'Output directory')
  .action(async (video, options) => {
    const platforms = options.platforms === 'all'
      ? ['tiktok', 'youtube', 'instagram', 'linkedin', 'twitter']
      : options.platforms.split(',')
    const outputDir = options.outputDir ?? '.'
    await generateVariants(video, { platforms, outputDir })
    console.log(`Variants saved to ${outputDir}`)
  })

// Shorts planning command
program
  .command('shorts-plan <video>')
  .description('Generate AI shorts strategy')
  .requiredOption('-t, --transcript <file>', 'Transcript JSON file')
  .option('-o, --output <file>', 'Output JSON file')
  .action(async (video, options) => {
    const fs = await import('node:fs/promises')
    const transcript = JSON.parse(await fs.readFile(options.transcript, 'utf-8'))
    const strategy = await planShorts(video, transcript)
    if (options.output) {
      await fs.writeFile(options.output, JSON.stringify(strategy, null, 2))
      console.log(`Shorts strategy saved to ${options.output}`)
    } else {
      console.log(JSON.stringify(strategy, null, 2))
    }
  })

// Social posts command
program
  .command('social-posts <video>')
  .description('Generate platform-specific social media posts')
  .option('-p, --platforms <list>', 'Platforms: tiktok,youtube,instagram,linkedin,twitter', 'all')
  .option('-o, --output <file>', 'Output JSON file')
  .action(async (video, options) => {
    const platforms = options.platforms === 'all'
      ? ['tiktok', 'youtube', 'instagram', 'linkedin', 'twitter']
      : options.platforms.split(',')
    const posts = await generatePosts(video, platforms)
    if (options.output) {
      const fs = await import('node:fs/promises')
      await fs.writeFile(options.output, JSON.stringify(posts, null, 2))
      console.log(`Social posts saved to ${options.output}`)
    } else {
      console.log(JSON.stringify(posts, null, 2))
    }
  })

// MCP server command
program
  .command('mcp')
  .description('Start MCP server for Copilot integration')
  .action(async () => {
    const { startMcpServer } = await import('./mcp/server.js')
    await startMcpServer()
  })

program.parse()
