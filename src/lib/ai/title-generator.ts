/**
 * AI-powered title generation using Gemini Flash Lite
 * Generates concise, descriptive titles for various node types based on their content
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL_NAME = 'gemini-2.0-flash-lite';

type NodeType = 'pdf' | 'image' | 'youtube' | 'voice' | 'webpage' | 'instagram' | 'linkedin';

interface TitleGenerationContext {
  nodeType: NodeType;
  content?: string;
  metadata?: {
    fileName?: string;
    description?: string;
    caption?: string;
    summary?: string;
    author?: string;
    pageCount?: number;
    duration?: string | number;
  };
}

/**
 * Generate a concise title for a node based on its content and type
 * Uses Gemini Flash Lite for fast, efficient title generation
 */
export async function generateNodeTitle(context: TitleGenerationContext): Promise<string | null> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[Title Generator] GEMINI_API_KEY not configured');
      return null;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.3, // Lower temperature for more focused titles
        maxOutputTokens: 20, // Keep titles very short
      },
    });

    const prompt = buildPrompt(context);
    const result = await model.generateContent(prompt);
    const title = result.response.text().trim();

    // Remove quotes if the model added them
    const cleanTitle = title.replace(/^["']|["']$/g, '');

    // Ensure title is not too long (max 50 chars)
    if (cleanTitle.length > 50) {
      return cleanTitle.substring(0, 47) + '...';
    }

    return cleanTitle || null;
  } catch (error) {
    console.error('[Title Generator] Error generating title:', error);
    return null;
  }
}

/**
 * Build the prompt for title generation based on node type and content
 */
function buildPrompt(context: TitleGenerationContext): string {
  const { nodeType, content, metadata } = context;

  let basePrompt = 'Generate a concise, descriptive title (max 6 words) for this content. Return ONLY the title, no quotes or extra text.\n\n';

  switch (nodeType) {
    case 'pdf':
      basePrompt += 'Document Type: PDF\n';
      if (metadata?.fileName) {
        basePrompt += `File Name: ${metadata.fileName}\n`;
      }
      if (metadata?.pageCount) {
        basePrompt += `Pages: ${metadata.pageCount}\n`;
      }
      if (content) {
        // Use first 1000 chars of PDF content
        basePrompt += `Content Preview:\n${content.substring(0, 1000)}\n`;
      }
      break;

    case 'image':
      basePrompt += 'Content Type: Image\n';
      if (metadata?.caption) {
        basePrompt += `Caption: ${metadata.caption}\n`;
      }
      if (metadata?.description) {
        basePrompt += `AI Description: ${metadata.description}\n`;
      }
      if (content) {
        basePrompt += `OCR Text: ${content.substring(0, 500)}\n`;
      }
      break;

    case 'youtube':
      basePrompt += 'Content Type: YouTube Video\n';
      if (metadata?.duration) {
        basePrompt += `Duration: ${metadata.duration}\n`;
      }
      if (content) {
        // Use first 2000 chars of transcript
        basePrompt += `Transcript Preview:\n${content.substring(0, 2000)}\n`;
      }
      break;

    case 'voice':
      basePrompt += 'Content Type: Voice Recording\n';
      if (metadata?.duration) {
        basePrompt += `Duration: ${metadata.duration}s\n`;
      }
      if (content) {
        basePrompt += `Transcript:\n${content.substring(0, 1000)}\n`;
      }
      break;

    case 'webpage':
      basePrompt += 'Content Type: Webpage\n';
      if (metadata?.description) {
        basePrompt += `Description: ${metadata.description}\n`;
      }
      if (content) {
        basePrompt += `Content Preview:\n${content.substring(0, 1500)}\n`;
      }
      break;

    case 'instagram':
      basePrompt += 'Content Type: Instagram Post\n';
      if (metadata?.author) {
        basePrompt += `Author: ${metadata.author}\n`;
      }
      if (metadata?.caption) {
        basePrompt += `Caption: ${metadata.caption}\n`;
      }
      if (metadata?.summary) {
        basePrompt += `Summary: ${metadata.summary}\n`;
      }
      break;

    case 'linkedin':
      basePrompt += 'Content Type: LinkedIn Post\n';
      if (metadata?.author) {
        basePrompt += `Author: ${metadata.author}\n`;
      }
      if (content) {
        basePrompt += `Content:\n${content.substring(0, 1000)}\n`;
      }
      if (metadata?.summary) {
        basePrompt += `Summary: ${metadata.summary}\n`;
      }
      break;

    default:
      basePrompt += `Content:\n${content?.substring(0, 1000) || 'No content available'}\n`;
  }

  return basePrompt;
}

/**
 * Generate titles for multiple nodes in parallel
 * Useful for batch processing
 */
export async function generateNodeTitles(
  contexts: TitleGenerationContext[]
): Promise<(string | null)[]> {
  return Promise.all(contexts.map(generateNodeTitle));
}
