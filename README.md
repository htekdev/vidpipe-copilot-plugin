# vidpipe-copilot-plugin

🎬 **GitHub Copilot CLI plugin for AI-powered video editing** — Gemini video analysis, FFmpeg editing tools, and viral content generation.

## Installation

```bash
# Install as a Copilot CLI plugin
gh copilot extensions install htekdev/vidpipe-copilot-plugin
```

## Features

### 🔍 Gemini Video Analysis
- **Editorial Analysis** — Cut point detection, pacing analysis, transition recommendations
- **Clip Direction** — Short (15-60s) and medium (60-180s) clip identification with engagement scoring
- **Enhancement Detection** — Overlay and diagram suggestions for visual comprehension

### ✂️ FFmpeg Video Tools
- **Silence Removal** — Detect and trim dead air
- **Clip Extraction** — Frame-accurate cutting
- **Caption Burning** — Hard-code ASS/SRT subtitles
- **Platform Variants** — Generate 16:9, 9:16, 1:1, 4:5 versions

### 🚀 Viral Content Generation
- **Shorts Planning** — Hook-first content strategy (Z→A→B→C pattern)
- **Social Posts** — Platform-optimized copy for TikTok, YouTube, Instagram, LinkedIn, X

## Skills

This plugin provides three skills:

| Skill | Description | Trigger Phrases |
|-------|-------------|-----------------|
| `video-analyze` | Gemini AI video analysis | "analyze video", "find clips", "where to cut" |
| `video-edit` | FFmpeg editing operations | "cut video", "remove silence", "burn captions" |
| `viral-content` | Shorts planning & social posts | "plan shorts", "social posts", "viral strategy" |

## MCP Tools

| Tool | Description |
|------|-------------|
| `analyze_video` | Gemini-powered video analysis (editorial/clips/enhancements) |
| `extract_clip` | Cut video segment with frame-accurate FFmpeg |
| `detect_silence` | Find silent regions in audio |
| `remove_silence` | Remove silent regions from video |
| `burn_captions` | Hard-code ASS/SRT subtitles |
| `generate_variants` | Create multi-platform aspect ratios |
| `plan_shorts` | AI shorts strategy with hooks |
| `generate_social_posts` | Platform-specific social copy |

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

## Plugin Structure

```
vidpipe-copilot-plugin/
├── plugin.json              # Plugin manifest
├── .mcp.json                # MCP server config
├── bin/
│   └── mcp-server.cjs       # Bundled MCP server
├── packages/
│   └── mcp-server/src/      # MCP server source
├── skills/
│   ├── video-analyze/SKILL.md
│   ├── video-edit/SKILL.md
│   └── viral-content/SKILL.md
└── .github/
    ├── copilot/copilot-instructions.md
    └── plugin/marketplace.json
```

## Development

```bash
# Install dependencies
npm install

# Bundle MCP server (commits to bin/)
npm run bundle

# Run tests
npm test
```

## Related Projects

- [vidpipeCLI](https://github.com/htekdev/vidpipeCLI) — Full video processing pipeline
- [agentic-video-editor](https://github.com/htekdev/agentic-video-editor) — Electron desktop app

## License

MIT © [htekdev](https://github.com/htekdev)
