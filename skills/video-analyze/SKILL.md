---
name: video-analyze
description: Analyze video files with Gemini AI for editorial direction, clip opportunities, and enhancement suggestions. USE THIS SKILL when the user wants to analyze a video for editing, find where to cut, identify clip opportunities, or get enhancement suggestions. Trigger phrases include "analyze video", "where should I cut", "find clips", "video analysis", "editorial direction", "enhancement suggestions".
---

# Video Analysis Skill

This skill provides AI-powered video analysis using Google Gemini. It can analyze videos for:

1. **Editorial Direction** — Cut points, transitions, pacing, hooks
2. **Clip Opportunities** — Short (15-60s) and medium (60-180s) clips for social platforms
3. **Enhancement Suggestions** — Overlay and diagram recommendations

## When to Use

| Scenario | Tool |
|----------|------|
| Find where to cut a video | `analyze_video` with `analysisType: "editorial"` |
| Identify viral clip opportunities | `analyze_video` with `analysisType: "clips"` |
| Get overlay/diagram suggestions | `analyze_video` with `analysisType: "enhancements"` |

## Tools

### `analyze_video`

Analyze a video file with Gemini AI.

**Input:**
- `videoPath` (string, required): Path to the video file
- `analysisType` (string): Type of analysis — `"editorial"`, `"clips"`, or `"enhancements"`

**Output:** Markdown analysis with embedded JSON containing structured data (cuts, clips, enhancements)

**Requirements:** `GEMINI_API_KEY` environment variable must be set.

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
