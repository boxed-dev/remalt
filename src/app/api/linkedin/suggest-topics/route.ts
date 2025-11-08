import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';

type TopicContext = {
  textContext: string[];
  youtubeTranscripts: Array<{ url: string; transcript?: string; title?: string; status: string }>;
  voiceTranscripts: Array<{ transcript?: string; status: string }>;
  pdfDocuments: Array<{ fileName?: string; parsedText?: string; status: string }>;
  images: Array<{ description?: string; ocrText?: string; status: string }>;
  webpages: Array<{ pageTitle?: string; pageContent?: string; status: string }>;
  instagramReels: Array<{ caption?: string; summary?: string; status: string }>;
  linkedinPosts: Array<{ content?: string; summary?: string; status: string }>;
  mindMaps: Array<{ concept: string; notes?: string }>;
};

function extractTopicsFromContext(context: TopicContext): Array<{ id: string; topic: string; source: string; context?: string }> {
  const topics: Array<{ id: string; topic: string; source: string; context?: string }> = [];

  // Extract from YouTube transcripts
  if (context.youtubeTranscripts?.length > 0) {
    context.youtubeTranscripts.forEach((video, index) => {
      if (video.status === 'success' && video.title) {
        topics.push({
          id: `youtube-${index}`,
          topic: `Insights from: ${video.title}`,
          source: 'YouTube Video',
          context: video.transcript?.substring(0, 500),
        });
      }
    });
  }

  // Extract from PDF documents
  if (context.pdfDocuments?.length > 0) {
    context.pdfDocuments.forEach((pdf, index) => {
      if (pdf.status === 'success' && pdf.fileName) {
        topics.push({
          id: `pdf-${index}`,
          topic: `Key takeaways from ${pdf.fileName}`,
          source: 'Document',
          context: pdf.parsedText?.substring(0, 500),
        });
      }
    });
  }

  // Extract from webpages
  if (context.webpages?.length > 0) {
    context.webpages.forEach((page, index) => {
      if (page.status === 'success' && page.pageTitle) {
        topics.push({
          id: `webpage-${index}`,
          topic: `Discussion on: ${page.pageTitle}`,
          source: 'Web Article',
          context: page.pageContent?.substring(0, 500),
        });
      }
    });
  }

  // Extract from Instagram reels
  if (context.instagramReels?.length > 0) {
    context.instagramReels.forEach((reel, index) => {
      if (reel.status === 'success' && (reel.caption || reel.summary)) {
        topics.push({
          id: `instagram-${index}`,
          topic: `Expand on Instagram content: ${(reel.caption || reel.summary)?.substring(0, 50)}...`,
          source: 'Instagram',
          context: reel.summary || reel.caption,
        });
      }
    });
  }

  // Extract from LinkedIn posts
  if (context.linkedinPosts?.length > 0) {
    context.linkedinPosts.forEach((post, index) => {
      if (post.status === 'success' && post.content) {
        topics.push({
          id: `linkedin-${index}`,
          topic: `Similar to: ${post.content.substring(0, 50)}...`,
          source: 'LinkedIn Post',
          context: post.summary || post.content?.substring(0, 500),
        });
      }
    });
  }

  // Extract from mind maps
  if (context.mindMaps?.length > 0) {
    context.mindMaps.forEach((mindMap, index) => {
      topics.push({
        id: `mindmap-${index}`,
        topic: mindMap.concept,
        source: 'Mind Map Idea',
        context: mindMap.notes,
      });
    });
  }

  // Extract from text nodes
  if (context.textContext?.length > 0) {
    context.textContext.forEach((text, index) => {
      if (text.length > 20) {
        topics.push({
          id: `text-${index}`,
          topic: `Elaborate on: ${text.substring(0, 60)}...`,
          source: 'Text Note',
          context: text.substring(0, 500),
        });
      }
    });
  }

  return topics;
}

async function generateAITopics(contextSummary: string): Promise<Array<{ id: string; topic: string; source: string }>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return [];
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 1024,
      },
    });

    const prompt = `You are a LinkedIn content strategist. Based on the following context, suggest 3-5 trending and engaging LinkedIn post topics.

Context:
${contextSummary || 'General professional topics'}

Requirements:
- Each topic should be 5-12 words
- Topics should be relevant to LinkedIn professionals
- Topics should be engaging and likely to drive discussion
- Topics should be specific and actionable
- Mix of thought leadership, industry insights, and practical tips

Format your response as a simple numbered list, one topic per line. Do not include any explanations or meta-commentary.

Example format:
1. How remote work is reshaping team collaboration
2. 5 data-driven strategies for customer retention
3. The future of AI in project management`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse the numbered list
    const lines = responseText.split('\n').filter(line => line.trim().match(/^\d+\./));
    const aiTopics = lines.map((line, index) => ({
      id: `ai-${index}`,
      topic: line.replace(/^\d+\.\s*/, '').trim(),
      source: 'AI Suggestion',
    }));

    return aiTopics.slice(0, 5);
  } catch (error) {
    console.error('[Suggest Topics] AI generation error:', error);
    return [];
  }
}

async function postHandler(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to get topic suggestions');
  }

  try {
    const { context } = (await req.json()) as {
      context: TopicContext;
    };

    // Extract topics from connected nodes
    const contextTopics = extractTopicsFromContext(context);

    // Build a summary of all context for AI topic generation
    let contextSummary = '';
    if (context.youtubeTranscripts?.length > 0) {
      contextSummary += `YouTube videos about: ${context.youtubeTranscripts.map(v => v.title).filter(Boolean).join(', ')}. `;
    }
    if (context.pdfDocuments?.length > 0) {
      contextSummary += `Documents: ${context.pdfDocuments.map(d => d.fileName).filter(Boolean).join(', ')}. `;
    }
    if (context.webpages?.length > 0) {
      contextSummary += `Web articles: ${context.webpages.map(p => p.pageTitle).filter(Boolean).join(', ')}. `;
    }
    if (context.mindMaps?.length > 0) {
      contextSummary += `Key ideas: ${context.mindMaps.map(m => m.concept).join(', ')}. `;
    }

    // Generate AI-powered topic suggestions
    const aiTopics = await generateAITopics(contextSummary);

    // Combine context topics and AI topics
    const allTopics = [...contextTopics, ...aiTopics];

    // Limit to top 10 topics
    const topics = allTopics.slice(0, 10);

    return NextResponse.json({
      topics,
      status: 'success',
    });
  } catch (error: unknown) {
    console.error('[Suggest Topics] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to suggest topics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = postHandler;
