---
name: video-edit
description: Perform video editing operations using FFmpeg — cut clips, remove silence, burn captions, generate platform variants. USE THIS SKILL when the user wants to edit video files, extract clips, remove silent parts, add subtitles, or create social media versions. Trigger phrases include "cut video", "extract clip", "remove silence", "burn captions", "add subtitles", "generate variants", "TikTok version", "YouTube Shorts".
---

# Video Editing Skill

This skill provides FFmpeg-based video editing tools for common operations:

1. **Clip Extraction** — Frame-accurate cutting
2. **Silence Removal** — Detect and trim silent regions
3. **Caption Burning** — Hard-code ASS/SRT subtitles
4. **Platform Variants** — Generate aspect ratio versions for social media

## When to Use

| Scenario | Tool |
|----------|------|
| Cut a clip from video | `extract_clip` |
| Find silent parts | `detect_silence` |
| Remove dead air | `remove_silence` |
| Add burned-in subtitles | `burn_captions` |
| Create TikTok/YouTube/Instagram versions | `generate_variants` |

## Tools

### `extract_clip`

Extract a clip with frame-accurate cutting.

**Input:**
- `videoPath` (string, required): Source video path
- `start` (number, required): Start time in seconds
- `end` (number, required): End time in seconds
- `output` (string, required): Output file path

**Output:** Confirmation with output path

### `detect_silence`

Find silent regions in video audio.

**Input:**
- `videoPath` (string, required): Video file path
- `threshold` (string): Silence threshold (default: "-30dB")
- `minDuration` (number): Minimum silence duration in seconds (default: 0.5)

**Output:** JSON array of silent regions with start, end, duration

### `remove_silence`

Remove all silent regions from video.

**Input:**
- `videoPath` (string, required): Video file path
- `output` (string, required): Output file path
- `threshold` (string): Silence threshold (default: "-30dB")
- `minDuration` (number): Minimum silence duration (default: 0.5)

**Output:** Confirmation with regions removed count and total time saved

### `burn_captions`

Hard-code subtitles into video (ASS or SRT format).

**Input:**
- `videoPath` (string, required): Video file path
- `captionsFile` (string, required): Path to ASS/SRT caption file
- `output` (string, required): Output file path

**Output:** Confirmation with output path

### `generate_variants`

Create platform-specific aspect ratio variants.

**Input:**
- `videoPath` (string, required): Video file path
- `platforms` (array, required): Target platforms — `tiktok`, `youtube`, `instagram`, `linkedin`, `twitter`
- `outputDir` (string, required): Output directory

**Output:** List of generated variant files

**Aspect Ratios:**
- TikTok: 9:16 portrait
- YouTube: 16:9 landscape, 9:16 shorts
- Instagram: 9:16 reels, 1:1 square, 4:5 feed
- LinkedIn: 16:9 landscape, 1:1 square
- Twitter: 16:9 landscape, 1:1 square

## Examples

**Extract a clip:**
```
Cut from 10 seconds to 45 seconds of video.mp4
```
→ `extract_clip` with start: 10, end: 45

**Remove silence:**
```
Clean up the dead air in my recording
```
→ `remove_silence`

**Create social media versions:**
```
Generate TikTok and YouTube Shorts versions
```
→ `generate_variants` with platforms: ["tiktok", "youtube"]
