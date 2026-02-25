---
name: video-analyze
description: Analyze video files with Gemini AI for editorial direction, clip opportunities, and enhancement suggestions. USE THIS SKILL when the user wants to analyze a video for editing, find where to cut, identify clip opportunities, or get enhancement suggestions. Trigger phrases include "analyze video", "where should I cut", "find clips", "video analysis", "editorial direction", "enhancement suggestions".
---

# Video Analysis Skill

This skill provides AI-powered video analysis using Google Gemini. It can analyze videos for:

1. **Editorial Direction** — Cut points, transitions, pacing, hooks
2. **Clip Opportunities** — Short (15-60s) and medium (60-180s) clips for social platforms
3. **Enhancement Suggestions** — Overlay and diagram recommendations

## Setup

Before using AI-powered analysis, configure your Gemini API key:

1. Get an API key from https://aistudio.google.com/apikey
2. Run the `setup_vidpipe` tool with your API key
3. Run `vidpipe_status` to verify configuration

## When to Use

| Scenario | Tool |
|----------|------|
| Check if vidpipe is configured | `vidpipe_status` |
| Configure Gemini API key | `setup_vidpipe` |
| Find where to cut a video | `analyze_video` with `analysisType: "editorial"` |
| Identify viral clip opportunities | `analyze_video` with `analysisType: "clips"` |
| Get overlay/diagram suggestions | `analyze_video` with `analysisType: "enhancements"` |

## Tools

### `setup_vidpipe`

Configure vidpipe with your Gemini API key. Only needs to be run once.

**Input:**
- `geminiApiKey` (string, required): Your Gemini API key
- `geminiModel` (string, optional): Model to use (default: gemini-2.5-flash)

### `vidpipe_status`

Check vidpipe configuration status and see which tools are available.

### `analyze_video`

Analyze a video file with Gemini AI.

**Input:**
- `videoPath` (string, required): Path to the video file
- `analysisType` (string): Type of analysis — `"editorial"`, `"clips"`, or `"enhancements"`

**Output:** Markdown analysis with embedded JSON containing structured data (cuts, clips, enhancements)

## Examples

**Editorial analysis:**
```
Analyze this video for editing: ./recording.mp4
```
→ Uses `analyze_video` with `analysisType: "editorial"`

**Find clip opportunities:**
```
What clips can I make from this video?
```
→ Uses `analyze_video` with `analysisType: "clips"`

**Enhancement suggestions:**
```
Where should I add diagrams or overlays?
```
→ Uses `analyze_video` with `analysisType: "enhancements"`

## Output Format

### Editorial Analysis
Returns cut recommendations with:
- `timestamp`: When to cut (seconds)
- `type`: "cut" or "transition"
- `transitionStyle`: hard, crossfade, dissolve, J-cut, L-cut
- `confidence`: high, medium, low
- `reason`: Why this cut is recommended

### Clip Analysis
Returns shorts and medium clips with:
- `id`: Unique slug
- `start`/`end`: Timestamps
- `hook`: Attention-grabbing moment
- `hookText`: ≤60 char overlay text
- `engagementScore`: 1-100
- `platforms`: tiktok, youtube_shorts, instagram_reels
- `tags`: 3-6 relevant tags
