#!/usr/bin/env node
/**
 * vidpipe MCP Server
 * 
 * Exposes video editing tools via Model Context Protocol for Copilot CLI.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, readFile, mkdir, rm, copyFile, access } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { join, basename } from "node:path";

const execFileAsync = promisify(execFile);

// ============================================================================
// Configuration Management
// ============================================================================
const CONFIG_DIR = join(homedir(), ".vidpipe");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface VidpipeConfig {
  geminiApiKey?: string;
  geminiModel?: string;
  ffmpegPath?: string;
  ffprobePath?: string;
}

async function loadConfig(): Promise<VidpipeConfig> {
  try {
    const data = await readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveConfig(config: VidpipeConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function getGeminiApiKey(): Promise<string | undefined> {
  // Priority: env var > config file
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  const config = await loadConfig();
  return config.geminiApiKey;
}

async function getGeminiModel(): Promise<string> {
  if (process.env.GEMINI_MODEL) {
    return process.env.GEMINI_MODEL;
  }
  const config = await loadConfig();
  return config.geminiModel ?? "gemini-2.5-flash";
}

const server = new McpServer(
  {
    name: "vidpipe",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================================================
// Tool: setup_vidpipe
// ============================================================================
server.tool(
  "setup_vidpipe",
  "Configure vidpipe with your Gemini API key. Run this once to enable AI-powered video analysis features. Get your API key from https://aistudio.google.com/apikey",
  {
    geminiApiKey: z.string().describe("Your Gemini API key from https://aistudio.google.com/apikey"),
    geminiModel: z.string().optional().describe("Gemini model to use (default: gemini-2.5-flash)"),
  },
  async ({ geminiApiKey, geminiModel }) => {
    try {
      const config = await loadConfig();
      config.geminiApiKey = geminiApiKey;
      if (geminiModel) {
        config.geminiModel = geminiModel;
      }
      await saveConfig(config);
      
      return {
        content: [{ 
          type: "text", 
          text: `✓ vidpipe configured successfully!\n\nConfig saved to: ${CONFIG_FILE}\n\nYou can now use AI-powered tools like analyze_video, plan_shorts, and generate_social_posts.` 
        }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error saving config: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================================
// Tool: vidpipe_status
// ============================================================================
server.tool(
  "vidpipe_status",
  "Check vidpipe configuration status and available features",
  {},
  async () => {
    const config = await loadConfig();
    const hasApiKey = !!(process.env.GEMINI_API_KEY || config.geminiApiKey);
    const model = await getGeminiModel();
    
    const status = [
      "# vidpipe Status\n",
      `Config file: ${CONFIG_FILE}`,
      `Gemini API Key: ${hasApiKey ? "✓ Configured" : "✗ Not configured (run setup_vidpipe)"}`,
      `Gemini Model: ${model}`,
      "",
      "## Available Tools",
      "",
      "### Always Available (FFmpeg)",
      "- extract_clip - Cut clips from video",
      "- detect_silence - Find silent regions",
      "- remove_silence - Remove dead air",
      "- burn_captions - Hard-code subtitles",
      "- generate_variants - Create aspect ratio variants",
      "",
      "### Requires Gemini API Key",
      `- analyze_video - ${hasApiKey ? "✓ Ready" : "✗ Needs setup"}`,
      `- plan_shorts - ${hasApiKey ? "✓ Ready" : "✗ Needs setup"}`,
      `- generate_social_posts - ${hasApiKey ? "✓ Ready" : "✗ Needs setup"}`,
    ];
    
    if (!hasApiKey) {
      status.push(
        "",
        "## Quick Setup",
        "1. Get API key from: https://aistudio.google.com/apikey",
        "2. Run: setup_vidpipe with your API key"
      );
    }
    
    return {
      content: [{ type: "text", text: status.join("\n") }],
    };
  }
);

// ============================================================================
// Tool: analyze_video (requires Gemini API)
// ============================================================================
server.tool(
  "analyze_video",
  "Analyze video with Gemini AI for editorial direction, clip opportunities, or enhancement suggestions. Run setup_vidpipe first to configure your API key.",
  {
    videoPath: z.string().describe("Path to the video file"),
    analysisType: z.enum(["editorial", "clips", "enhancements"]).default("editorial").describe("Type of analysis: 'editorial' (cuts/transitions), 'clips' (shorts/medium clips), 'enhancements' (overlay suggestions)"),
  },
  async ({ videoPath, analysisType }) => {
    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
      return {
        content: [{ type: "text", text: "Error: Gemini API key not configured.\n\nRun setup_vidpipe with your API key from https://aistudio.google.com/apikey" }],
        isError: true,
      };
    }

    const modelName = await getGeminiModel();
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const { GoogleAIFileManager, FileState } = await import("@google/generative-ai/server");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const fileManager = new GoogleAIFileManager(apiKey);

    const prompts = {
      editorial: `Analyze this video for editorial direction. Identify:
1. Cut points with timestamps and transition recommendations (hard cut, crossfade, dissolve, J-cut, L-cut)
2. Pacing analysis (slow/fast sections, dead air)
3. Hook rating (1-10) with improvement suggestions
4. Content structure (intro/body/outro timestamps)

Return markdown analysis + JSON: \`\`\`json{"cuts":[{"timestamp":10.5,"type":"cut","confidence":"high","reason":"..."}]}\`\`\``,

      clips: `Identify viral clip opportunities:
**SHORTS (15-60s)**: 3-8 clips for TikTok/YouTube Shorts/Instagram Reels with hooks, engagement scores (1-100), tags
**MEDIUM (60-180s)**: 2-4 standalone narrative arcs

Use hook-first (Z→A→B→C) strategy. Return markdown + JSON: \`\`\`json{"shorts":[...],"mediumClips":[...]}\`\`\``,

      enhancements: `Identify moments where AI overlays would improve comprehension:
- Diagrams, flowcharts, infographics, code visuals
- Placement guidance (avoid webcam/content)
- Duration and description

Return markdown + JSON: \`\`\`json{"enhancements":[{"timestamp":30,"duration":5,"type":"diagram","description":"...","placement":{"x":"right","y":"center"}}]}\`\`\``,
    };

    try {
      const uploadResult = await fileManager.uploadFile(videoPath, { mimeType: "video/mp4" });
      let file = uploadResult.file;
      
      while (file.state === FileState.PROCESSING) {
        await new Promise(r => setTimeout(r, 2000));
        file = await fileManager.getFile(file.name);
      }

      if (file.state === FileState.FAILED) {
        throw new Error("Video processing failed");
      }

      const result = await model.generateContent([
        { text: prompts[analysisType] },
        { fileData: { mimeType: "video/mp4", fileUri: file.uri } },
      ]);

      return {
        content: [{ type: "text", text: result.response.text() }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================================
// Tool: extract_clip
// ============================================================================
server.tool(
  "extract_clip",
  "Extract a clip from video using FFmpeg with frame-accurate cutting",
  {
    videoPath: z.string().describe("Path to source video file"),
    start: z.number().describe("Start time in seconds"),
    end: z.number().describe("End time in seconds"),
    output: z.string().describe("Output file path"),
  },
  async ({ videoPath, start, end, output }) => {
    const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";
    const buffer = 1;
    const actualStart = Math.max(0, start - buffer);
    const duration = end - start + buffer * 2;

    try {
      await execFileAsync(ffmpeg, [
        "-y", "-ss", String(actualStart), "-i", videoPath,
        "-t", String(duration),
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        output,
      ], { maxBuffer: 50 * 1024 * 1024 });

      return {
        content: [{ type: "text", text: `Clip extracted: ${output}\nDuration: ${end - start}s (with ${buffer}s buffer)` }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `FFmpeg error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================================
// Tool: detect_silence
// ============================================================================
server.tool(
  "detect_silence",
  "Detect silent regions in video audio using FFmpeg silencedetect",
  {
    videoPath: z.string().describe("Path to video file"),
    threshold: z.string().default("-30dB").describe("Silence threshold in dB (default: -30dB)"),
    minDuration: z.number().default(0.5).describe("Minimum silence duration in seconds (default: 0.5)"),
  },
  async ({ videoPath, threshold, minDuration }) => {
    const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";

    try {
      const { stderr } = await execFileAsync(ffmpeg, [
        "-i", videoPath,
        "-af", `silencedetect=noise=${threshold}:d=${minDuration}`,
        "-f", "null", "-",
      ], { maxBuffer: 50 * 1024 * 1024 });

      const regions = [];
      let currentStart = null;

      for (const line of stderr.split("\n")) {
        const startMatch = line.match(/silence_start: ([\d.]+)/);
        const endMatch = line.match(/silence_end: ([\d.]+)/);

        if (startMatch) currentStart = parseFloat(startMatch[1]);
        else if (endMatch && currentStart !== null) {
          const end = parseFloat(endMatch[1]);
          regions.push({ start: currentStart, end, duration: end - currentStart });
          currentStart = null;
        }
      }

      return {
        content: [{ type: "text", text: `Found ${regions.length} silent regions:\n${JSON.stringify(regions, null, 2)}` }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `FFmpeg error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================================
// Tool: remove_silence
// ============================================================================
server.tool(
  "remove_silence",
  "Remove silent regions from video using FFmpeg trim filter",
  {
    videoPath: z.string().describe("Path to video file"),
    output: z.string().describe("Output file path"),
    threshold: z.string().default("-30dB").describe("Silence threshold in dB (default: -30dB)"),
    minDuration: z.number().default(0.5).describe("Minimum silence duration (default: 0.5)"),
  },
  async ({ videoPath, output, threshold, minDuration }) => {
    const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";
    const ffprobe = process.env.FFPROBE_PATH ?? "ffprobe";

    try {
      // Detect silence
      const { stderr } = await execFileAsync(ffmpeg, [
        "-i", videoPath,
        "-af", `silencedetect=noise=${threshold}:d=${minDuration}`,
        "-f", "null", "-",
      ], { maxBuffer: 50 * 1024 * 1024 });

      const silentRegions = [];
      let currentStart = null;

      for (const line of stderr.split("\n")) {
        const startMatch = line.match(/silence_start: ([\d.]+)/);
        const endMatch = line.match(/silence_end: ([\d.]+)/);

        if (startMatch) currentStart = parseFloat(startMatch[1]);
        else if (endMatch && currentStart !== null) {
          silentRegions.push({ start: currentStart, end: parseFloat(endMatch[1]) });
          currentStart = null;
        }
      }

      if (silentRegions.length === 0) {
        await execFileAsync(ffmpeg, ["-y", "-i", videoPath, "-c", "copy", output]);
        return { content: [{ type: "text", text: `No silence detected. Copied to: ${output}` }] };
      }

      // Get total duration
      const { stdout } = await execFileAsync(ffprobe, [
        "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", videoPath,
      ]);
      const totalDuration = parseFloat(stdout.trim());

      // Calculate keep regions
      const keepRegions = [];
      let cursor = 0;
      for (const silent of silentRegions) {
        if (silent.start > cursor) keepRegions.push({ start: cursor, end: silent.start });
        cursor = silent.end;
      }
      if (cursor < totalDuration) keepRegions.push({ start: cursor, end: totalDuration });

      // Build filter
      const trimFilters = [];
      const concatInputs = [];
      for (let i = 0; i < keepRegions.length; i++) {
        const r = keepRegions[i];
        trimFilters.push(`[0:v]trim=start=${r.start}:end=${r.end},setpts=PTS-STARTPTS[v${i}]`);
        trimFilters.push(`[0:a]atrim=start=${r.start}:end=${r.end},asetpts=PTS-STARTPTS[a${i}]`);
        concatInputs.push(`[v${i}][a${i}]`);
      }

      const filterComplex = [...trimFilters, `${concatInputs.join("")}concat=n=${keepRegions.length}:v=1:a=1[outv][outa]`].join(";");

      await execFileAsync(ffmpeg, [
        "-y", "-i", videoPath,
        "-filter_complex", filterComplex,
        "-map", "[outv]", "-map", "[outa]",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        output,
      ], { maxBuffer: 50 * 1024 * 1024 });

      const removedSeconds = silentRegions.reduce((sum, r) => sum + (r.end - r.start), 0);
      return {
        content: [{ type: "text", text: `Removed ${silentRegions.length} silent regions (${removedSeconds.toFixed(1)}s total)\nOutput: ${output}` }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================================
// Tool: burn_captions
// ============================================================================
server.tool(
  "burn_captions",
  "Hard-code ASS/SRT subtitles into video",
  {
    videoPath: z.string().describe("Path to video file"),
    captionsFile: z.string().describe("Path to ASS/SRT caption file"),
    output: z.string().describe("Output file path"),
  },
  async ({ videoPath, captionsFile, output }) => {
    const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";

    // Use temp dir to avoid Windows path issues with colons
    const tempDir = join(tmpdir(), `vidpipe-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    try {
      const tempCaptions = join(tempDir, basename(captionsFile));
      await copyFile(captionsFile, tempCaptions);

      const isAss = captionsFile.toLowerCase().endsWith(".ass");
      const subtitleFilter = isAss
        ? `ass=${basename(tempCaptions)}:fontsdir=.`
        : `subtitles=${basename(tempCaptions)}`;

      await execFileAsync(ffmpeg, [
        "-y", "-i", videoPath,
        "-vf", subtitleFilter,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "copy",
        output,
      ], { cwd: tempDir, maxBuffer: 50 * 1024 * 1024 });

      return {
        content: [{ type: "text", text: `Captions burned into: ${output}` }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err.message}` }],
        isError: true,
      };
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
);

// ============================================================================
// Tool: generate_variants
// ============================================================================
server.tool(
  "generate_variants",
  "Generate platform-specific aspect ratio variants (16:9, 9:16, 1:1, 4:5)",
  {
    videoPath: z.string().describe("Path to video file"),
    platforms: z.array(z.string()).describe("Target platforms: tiktok, youtube, instagram, linkedin, twitter"),
    outputDir: z.string().describe("Output directory"),
  },
  async ({ videoPath, platforms, outputDir }) => {
    const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";
    const ffprobe = process.env.FFPROBE_PATH ?? "ffprobe";

    const platformRatios = {
      tiktok: [{ w: 9, h: 16, name: "portrait" }],
      youtube: [{ w: 16, h: 9, name: "landscape" }, { w: 9, h: 16, name: "shorts" }],
      instagram: [{ w: 9, h: 16, name: "reels" }, { w: 1, h: 1, name: "square" }, { w: 4, h: 5, name: "feed" }],
      linkedin: [{ w: 16, h: 9, name: "landscape" }, { w: 1, h: 1, name: "square" }],
      twitter: [{ w: 16, h: 9, name: "landscape" }, { w: 1, h: 1, name: "square" }],
    };

    try {
      await mkdir(outputDir, { recursive: true });

      // Get source resolution
      const { stdout } = await execFileAsync(ffprobe, [
        "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height", "-of", "json", videoPath,
      ]);
      const { streams } = JSON.parse(stdout);
      const srcWidth = streams[0].width;
      const srcHeight = streams[0].height;
      const srcAspect = srcWidth / srcHeight;

      const baseName = basename(videoPath, ".mp4");
      const outputs = [];
      const generated = new Set();

      for (const platform of platforms) {
        const ratios = platformRatios[platform] || [];
        for (const ratio of ratios) {
          const key = `${ratio.w}x${ratio.h}`;
          if (generated.has(key)) continue;
          generated.add(key);

          const targetAspect = ratio.w / ratio.h;
          let filter;

          if (Math.abs(srcAspect - targetAspect) < 0.01) {
            filter = null; // Same aspect
          } else if (srcAspect > targetAspect) {
            const outW = Math.round(srcHeight * targetAspect);
            const cropX = Math.round((srcWidth - outW) / 2);
            filter = `crop=${outW}:${srcHeight}:${cropX}:0`;
          } else {
            const outH = Math.round(srcWidth / targetAspect);
            const cropY = Math.round((srcHeight - outH) / 2);
            filter = `crop=${srcWidth}:${outH}:0:${cropY}`;
          }

          const outPath = join(outputDir, `${baseName}_${ratio.name}_${key}.mp4`);
          const args = filter
            ? ["-y", "-i", videoPath, "-vf", filter, "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "copy", outPath]
            : ["-y", "-i", videoPath, "-c", "copy", outPath];

          await execFileAsync(ffmpeg, args, { maxBuffer: 50 * 1024 * 1024 });
          outputs.push(outPath);
        }
      }

      return {
        content: [{ type: "text", text: `Generated ${outputs.length} variants:\n${outputs.join("\n")}` }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================================
// Tool: plan_shorts
// ============================================================================
server.tool(
  "plan_shorts",
  "AI-powered shorts strategy with hooks, engagement scoring, and platform targeting. Run setup_vidpipe first to configure your API key.",
  {
    videoPath: z.string().describe("Path to video file"),
    transcriptJson: z.string().describe("Transcript as JSON array of {start, end, text} segments"),
  },
  async ({ videoPath, transcriptJson }) => {
    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
      return {
        content: [{ type: "text", text: "Error: Gemini API key not configured.\n\nRun setup_vidpipe with your API key from https://aistudio.google.com/apikey" }],
        isError: true,
      };
    }

    try {
      const transcript = JSON.parse(transcriptJson);
      const transcriptText = transcript
        .map((s) => `[${Math.floor(s.start / 60)}:${String(Math.floor(s.start % 60)).padStart(2, "0")}] ${s.text}`)
        .join("\n");

      const modelName = await getGeminiModel();
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });

      const prompt = `You are a viral content strategist. Analyze this transcript and plan short clips (15-60s) for TikTok, YouTube Shorts, Instagram Reels.

**STRATEGY: Hook-First (Z→A→B→C)** — Lead with the most exciting moment.

For each short provide:
- id (slug), title, start/end timestamps, hook description, hookText (≤60 chars for overlay)
- engagementScore (1-100), platforms, tags (3-6 lowercase)

Return JSON: \`\`\`json{"shorts":[...]}\`\`\`

TRANSCRIPT:
${transcriptText}`;

      const result = await model.generateContent(prompt);
      return {
        content: [{ type: "text", text: result.response.text() }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================================
// Tool: generate_social_posts
// ============================================================================
server.tool(
  "generate_social_posts",
  "Generate platform-optimized social media posts. Run setup_vidpipe first to configure your API key.",
  {
    videoPath: z.string().describe("Path to video file"),
    platforms: z.array(z.string()).describe("Target platforms: tiktok, youtube, instagram, linkedin, twitter"),
    context: z.string().default("").describe("Optional context about the video content"),
  },
  async ({ videoPath, platforms, context }) => {
    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
      return {
        content: [{ type: "text", text: "Error: Gemini API key not configured.\n\nRun setup_vidpipe with your API key from https://aistudio.google.com/apikey" }],
        isError: true,
      };
    }

    try {
      const modelName = await getGeminiModel();
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const { GoogleAIFileManager, FileState } = await import("@google/generative-ai/server");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      const fileManager = new GoogleAIFileManager(apiKey);

      const uploadResult = await fileManager.uploadFile(videoPath, { mimeType: "video/mp4" });
      let file = uploadResult.file;
      while (file.state === FileState.PROCESSING) {
        await new Promise(r => setTimeout(r, 2000));
        file = await fileManager.getFile(file.name);
      }

      const prompt = `Generate social media posts for: ${platforms.join(", ")}

Platform constraints:
- TikTok: 150 chars, emoji-heavy, casual
- YouTube: SEO title + description
- Instagram: 2200 chars, 30 hashtags max
- LinkedIn: Professional, 3000 chars
- Twitter/X: 280 chars, thread-ready

${context ? `Context: ${context}` : ""}

Return JSON array: \`\`\`json[{"platform":"...","content":"...","hashtags":[...],"characterCount":N}]\`\`\``;

      const result = await model.generateContent([
        { text: prompt },
        { fileData: { mimeType: "video/mp4", fileUri: file.uri } },
      ]);

      return {
        content: [{ type: "text", text: result.response.text() }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ============================================================================
// Start server
// ============================================================================
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
