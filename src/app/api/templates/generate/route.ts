import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';

type TemplateType = 'youtube-script' | 'ad-copy' | 'captions' | 'blog-post' | 'custom';

type TemplateContext = {
  textContext: string[];
  youtubeTranscripts: Array<{ url: string; transcript?: string; status: string; method?: string }>;
  voiceTranscripts: Array<{ audioUrl?: string; transcript?: string; duration?: number; status: string }>;
  pdfDocuments: Array<{ fileName?: string; parsedText?: string; segments?: Array<{ heading?: string; content: string }>; status: string }>;
  images: Array<{ imageUrl?: string; caption?: string; ocrText?: string; description?: string; tags?: string[]; status: string }>;
  webpages: Array<{ url: string; pageTitle?: string; pageContent?: string; metadata?: { description?: string }; status: string }>;
  mindMaps: Array<{ concept: string; notes?: string; tags?: string[] }>;
  templates: Array<{ templateType: string; generatedContent?: string; status: string }>;
};

const TEMPLATE_PROMPTS: Record<TemplateType, string> = {
  'youtube-script': 'Create a detailed YouTube video script with hook, segment breakdown, and call to action.',
  'ad-copy': 'Write high-converting ad copy with a compelling headline, value proposition, and clear CTA.',
  'captions': 'Produce engaging social-media captions with optional hashtags and emoji where appropriate.',
  'blog-post': 'Draft a structured blog post with introduction, key sections, and conclusion.',
  custom: 'Follow the custom instructions provided by the user to craft tailored content.',
};

function buildContextSection(context: TemplateContext): string {
  let contextString = '';

  if (context.textContext.length > 0) {
    contextString += '\n\n=== Notes ===\n';
    context.textContext.forEach((text, index) => {
      contextString += `\n[Note ${index + 1}]\n${text}\n`;
    });
  }

  if (context.youtubeTranscripts.length > 0) {
    contextString += '\n\n=== YouTube Transcripts ===\n';
    context.youtubeTranscripts.forEach((video, index) => {
      if (video.transcript && video.status === 'success') {
        contextString += `\n[Video ${index + 1} - ${video.url}]\n${video.transcript}\n`;
      }
    });
  }

  if (context.voiceTranscripts.length > 0) {
    contextString += '\n\n=== Voice Notes ===\n';
    context.voiceTranscripts.forEach((voice, index) => {
      if (voice.transcript && voice.status === 'success') {
        const duration = voice.duration ? ` (${Math.round(voice.duration)}s)` : '';
        contextString += `\n[Recording ${index + 1}${duration}]\n${voice.transcript}\n`;
      }
    });
  }

  if (context.pdfDocuments.length > 0) {
    contextString += '\n\n=== Documents ===\n';
    context.pdfDocuments.forEach((pdf, index) => {
      if (pdf.status === 'success') {
        contextString += `\n[Document ${index + 1} - ${pdf.fileName || 'Untitled'}]\n`;
        if (pdf.segments?.length) {
          pdf.segments.forEach((segment) => {
            if (segment.heading) {
              contextString += `\n## ${segment.heading}\n${segment.content}\n`;
            } else {
              contextString += `${segment.content}\n`;
            }
          });
        } else if (pdf.parsedText) {
          contextString += `${pdf.parsedText}\n`;
        }
      }
    });
  }

  if (context.images.length > 0) {
    contextString += '\n\n=== Image Insights ===\n';
    context.images.forEach((image, index) => {
      if (image.status === 'success') {
        contextString += `\n[Image ${index + 1}]\n`;
        if (image.caption) contextString += `Caption: ${image.caption}\n`;
        if (image.description) contextString += `Description: ${image.description}\n`;
        if (image.ocrText) contextString += `Text: ${image.ocrText}\n`;
        if (image.tags?.length) contextString += `Tags: ${image.tags.join(', ')}\n`;
      }
    });
  }

  if (context.webpages.length > 0) {
    contextString += '\n\n=== Web Pages ===\n';
    context.webpages.forEach((page, index) => {
      if (page.status === 'success') {
        contextString += `\n[Page ${index + 1} - ${page.pageTitle || page.url}]\n`;
        if (page.metadata?.description) {
          contextString += `Description: ${page.metadata.description}\n`;
        }
        if (page.pageContent) {
          contextString += `${page.pageContent}\n`;
        }
      }
    });
  }

  if (context.mindMaps.length > 0) {
    contextString += '\n\n=== Mind Maps ===\n';
    context.mindMaps.forEach((mindMap, index) => {
      contextString += `\n[Idea ${index + 1}] ${mindMap.concept}\n`;
      if (mindMap.notes) contextString += `Notes: ${mindMap.notes}\n`;
      if (mindMap.tags?.length) contextString += `Tags: ${mindMap.tags.join(', ')}\n`;
    });
  }

  if (context.templates.length > 0) {
    contextString += '\n\n=== Existing Drafts ===\n';
    context.templates.forEach((template, index) => {
      if (template.generatedContent && template.status === 'success') {
        contextString += `\n[Draft ${index + 1}]\n${template.generatedContent}\n`;
      }
    });
  }


  return contextString;
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to generate templates');
  }

  try {
    const { templateType, customPrompt, context } = (await req.json()) as {
      templateType: TemplateType;
      customPrompt?: string;
      context: TemplateContext;
    };

    if (!templateType) {
      return NextResponse.json({ error: 'templateType is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 2048,
      },
    });

    const templateInstruction = TEMPLATE_PROMPTS[templateType] || TEMPLATE_PROMPTS.custom;
    const contextSection = buildContextSection(context);

    const basePrompt = `You are an expert content strategist. Use the context provided to craft the requested asset.

Instructions:
- ${templateInstruction}
- Tailor the output using the provided notes, transcripts, and assets.
- Keep the tone consistent with the input materials.
- If context is missing, make reasonable assumptions and proceed.
${customPrompt ? `\nAdditional User Instructions:\n${customPrompt}\n` : ''}

Context:${contextSection || '\n(No additional context provided)'}

Deliver the final output ready for immediate use.`;

    const result = await model.generateContent(basePrompt);
    const responseText = result.response.text();

    return NextResponse.json({
      content: responseText,
      status: 'success',
    });
  } catch (error: unknown) {
    console.error('Template generation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate content';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
