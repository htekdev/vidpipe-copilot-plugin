---
name: viral-content
description: Generate viral content strategy — shorts planning with hooks, engagement scoring, and platform-optimized social media posts. USE THIS SKILL when the user wants to create viral clips, plan shorts for TikTok/YouTube/Instagram, or generate social media posts. Trigger phrases include "plan shorts", "viral strategy", "social posts", "TikTok post", "YouTube description", "Instagram caption", "engagement optimization".
---

# Viral Content Skill

This skill provides AI-powered viral content generation:

1. **Shorts Planning** — Identify clip opportunities with hooks and engagement scoring
2. **Social Posts** — Platform-optimized copy for TikTok, YouTube, Instagram, LinkedIn, X

## When to Use

| Scenario | Tool |
|----------|------|
| Plan short clips from video | `plan_shorts` |
| Generate social media posts | `generate_social_posts` |

## Tools

### `plan_shorts`

AI-powered shorts strategy with hook-first content planning.

**Input:**
- `videoPath` (string, required): Path to video file
- `transcriptJson` (string, required): Transcript as JSON array of `{start, end, text}` segments

**Output:** Strategy with shorts including:
- `id`: Unique slug
- `title`: Compelling title
- `start`/`end`: Timestamps
- `hook`: Attention-grabbing moment
- `hookText`: ≤60 chars for on-screen overlay
- `engagementScore`: 1-100 predicted engagement
- `platforms`: tiktok, youtube_shorts, instagram_reels
- `tags`: 3-6 lowercase tags

**Requirements:** `GEMINI_API_KEY` environment variable

**Strategy: Hook-First (Z→A→B→C)**
Lead with the most exciting moment, then provide context. Viewers decide in 3 seconds.

### `generate_social_posts`

Generate platform-specific social media posts.

**Input:**
- `videoPath` (string, required): Path to video file
- `platforms` (array, required): Target platforms — `tiktok`, `youtube`, `instagram`, `linkedin`, `twitter`
- `context` (string): Optional context about the video

**Output:** Posts for each platform with:
- `platform`: Target platform
- `content`: Post copy
- `hashtags`: Relevant tags
- `characterCount`: Length validation

**Requirements:** `GEMINI_API_KEY` environment variable

**Platform Constraints:**
| Platform | Max Length | Style |
|----------|------------|-------|
| TikTok | 150 chars | Emoji-heavy, casual, trending hashtags |
| YouTube | SEO-focused | Title + description, searchable keywords |
| Instagram | 2200 chars | Visual storytelling, 30 hashtags max |
| LinkedIn | 3000 chars | Professional thought-leadership |
| X/Twitter | 280 chars | Thread-ready, conversation starters |

## Examples

**Plan shorts:**
```
Plan viral shorts from this video and transcript
```
→ `plan_shorts` with video path and transcript JSON

**Generate posts:**
```
Write social media posts for TikTok and Instagram
```
→ `generate_social_posts` with platforms: ["tiktok", "instagram"]

**Full workflow:**
1. Use `video-analyze` skill to get clip analysis
2. Use `plan_shorts` with transcript for detailed strategy
3. Use `video-edit` skill to extract clips
4. Use `generate_social_posts` for platform copy

## Content Types to Identify

- Key insights and revelations
- Surprising facts or controversial takes
- Emotional peaks (humor, inspiration, frustration)
- Before/after demonstrations
- Quick tips and how-tos
- Quotable moments
