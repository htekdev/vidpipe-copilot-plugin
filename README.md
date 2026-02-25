# vidpipe-copilot-plugin

🎬 **GitHub Copilot CLI plugin for AI-powered video editing** — Gemini video analysis, FFmpeg editing tools, and viral content generation.

## Features

### 🔍 Gemini Video Analysis
- **Editorial Analysis** — AI-powered cut point detection, pacing analysis, and transition recommendations
- **Clip Direction** — Automatic short (15-60s) and medium (60-180s) clip identification with engagement scoring
- **Enhancement Detection** — Smart overlay and diagram suggestions for visual comprehension

### ✂️ FFmpeg Video Tools
- **Silence Removal** — Detect and trim dead air for tighter content
- **Clip Extraction** — Frame-accurate cutting with smart keyframe handling
- **Caption Burning** — Hard-code styled ASS subtitles into video
- **Platform Variants** — Generate 16:9, 9:16, 1:1, 4:5 versions for all platforms
- **Composite Clips** — Merge non-contiguous segments with crossfade transitions

### 🚀 Viral Content Generation
- **Shorts Planning** — Hook-first content strategy (Z→A→B→C pattern) for maximum retention
- **Social Posts** — Platform-optimized copy for TikTok, YouTube, Instagram, LinkedIn, X
- **Hashtag Strategy** — Trending tag research and platform-specific limits

## Installation

```bash
# Install as a Copilot CLI plugin
gh copilot extensions install htekdev/vidpipe-copilot-plugin

# Or add to your project
npm install vidpipe-copilot-plugin
```

## Skills

### `video-analyze`
Analyze a video file with Gemini AI for editorial direction, clip opportunities, and enhancement suggestions.

```
@vidpipe analyze ./recording.mp4 --type editorial
@vidpipe analyze ./recording.mp4 --type clips
@vidpipe analyze ./recording.mp4 --type enhancements
```

### `video-edit`
Perform video editing operations using FFmpeg.

```
@vidpipe cut ./video.mp4 --start 10 --end 45 --output clip.mp4
@vidpipe silence-remove ./video.mp4 --threshold -30dB
@vidpipe burn-captions ./video.mp4 --captions ./captions.ass
@vidpipe variants ./video.mp4 --platforms tiktok,youtube,instagram
```

### `viral-content`
Generate viral content strategy and social media posts.

```
@vidpipe shorts-plan ./video.mp4 --transcript ./transcript.json
@vidpipe social-posts ./video.mp4 --platforms all
```

## MCP Server

This plugin also exposes an MCP server with video editing tools:

```json
{
  "mcpServers": {
    "vidpipe": {
      "type": "local",
      "command": "npx",
      "args": ["vidpipe-copilot-plugin", "mcp"],
      "tools": ["*"]
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `analyze_video` | Gemini-powered video analysis |
| `extract_clip` | Cut video segment with FFmpeg |
| `remove_silence` | Detect and trim silent regions |
| `burn_captions` | Hardcode subtitles into video |
| `generate_variants` | Create multi-platform aspect ratios |
| `plan_shorts` | AI shorts strategy with hooks |
| `generate_posts` | Platform-specific social copy |

## Configuration

Set these environment variables:

```bash
# Required for Gemini analysis
GEMINI_API_KEY=your-api-key

# Optional model override (default: gemini-2.5-pro)
GEMINI_MODEL=gemini-2.5-pro

# FFmpeg path (auto-detected if not set)
FFMPEG_PATH=/usr/local/bin/ffmpeg
FFPROBE_PATH=/usr/local/bin/ffprobe
```

## Architecture

```
src/
├── tools/           # Individual tool implementations
│   ├── analyzeVideo.ts
│   ├── extractClip.ts
│   ├── removeSilence.ts
│   ├── burnCaptions.ts
│   ├── generateVariants.ts
│   └── viralContent.ts
├── skills/          # Copilot skill definitions
│   ├── video-analyze.yaml
│   ├── video-edit.yaml
│   └── viral-content.yaml
├── mcp/             # MCP server implementation
│   └── server.ts
├── cli.ts           # Commander CLI entry
└── index.ts         # Plugin exports
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode
npm run dev
```

## Related Projects

- [vidpipe](https://github.com/htekdev/vidpipe) — Full video processing pipeline
- [agentic-video-editor](https://github.com/htekdev/agentic-video-editor) — Electron desktop app

## License

MIT © [htekdev](https://github.com/htekdev)
