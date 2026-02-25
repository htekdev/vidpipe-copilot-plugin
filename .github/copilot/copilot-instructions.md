# Copilot Instructions — vidpipe-copilot-plugin

## Overview

This is a GitHub Copilot CLI plugin for AI-powered video editing. It provides:

1. **Gemini Video Analysis** — Editorial direction, clip detection, enhancement suggestions
2. **FFmpeg Video Tools** — Clip extraction, silence removal, caption burning, platform variants
3. **Viral Content Generation** — Shorts planning with hooks, social media post generation

## Architecture

```
src/
├── tools/           # Individual tool implementations
├── skills/          # Copilot skill YAML definitions
├── mcp/             # MCP server for tool exposure
├── cli.ts           # Commander CLI entry
└── index.ts         # Plugin exports
```

## Tool Patterns

### Gemini Analysis Tools
- Upload video to Gemini Files API
- Wait for ACTIVE state before analysis
- Parse JSON from markdown code blocks in response
- Return both raw analysis text and structured data

### FFmpeg Tools
- Use `execFile()` not `exec()` for security
- Set `maxBuffer: 50 * 1024 * 1024` for large outputs
- Use temp directories for caption burning (Windows path issues)
- Single-pass filters when combining operations

### Viral Content Tools
- Hook-first strategy (Z→A→B→C) for shorts
- Platform-specific constraints (char limits, hashtag counts)
- Engagement scoring (1-100 scale)

## Environment Variables

```
GEMINI_API_KEY     # Required for analysis
GEMINI_MODEL       # Optional (default: gemini-2.5-pro)
FFMPEG_PATH        # Optional (auto-detected)
FFPROBE_PATH       # Optional (auto-detected)
```

## Testing

Run tests with `npm test`. Coverage target: 80%.
