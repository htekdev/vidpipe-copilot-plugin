/**
 * vidpipe-copilot-plugin
 *
 * GitHub Copilot CLI plugin for AI-powered video editing.
 */

export { analyzeVideo, type AnalysisType, type AnalysisResult } from './tools/analyzeVideo.js'
export { extractClip, type ClipOptions } from './tools/extractClip.js'
export { removeSilence, type SilenceOptions } from './tools/removeSilence.js'
export { burnCaptions, type CaptionOptions } from './tools/burnCaptions.js'
export { generateVariants, type VariantOptions, type Platform } from './tools/generateVariants.js'
export { planShorts, generatePosts, type ShortsStrategy, type SocialPost } from './tools/viralContent.js'
