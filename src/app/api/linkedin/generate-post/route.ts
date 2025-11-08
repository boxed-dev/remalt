import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';
import type { LinkedInCreatorNodeData } from '@/types/workflow';

type PostContext = {
  textContext: string[];
  youtubeTranscripts: Array<{ url: string; transcript?: string; status: string }>;
  voiceTranscripts: Array<{ audioUrl?: string; transcript?: string; duration?: number; status: string }>;
  pdfDocuments: Array<{ fileName?: string; parsedText?: string; segments?: Array<{ heading?: string; content: string }>; status: string }>;
  images: Array<{ imageUrl?: string; caption?: string; ocrText?: string; description?: string; status: string }>;
  webpages: Array<{ url: string; pageTitle?: string; pageContent?: string; status: string }>;
  instagramReels: Array<{ caption?: string; transcript?: string; summary?: string; status: string }>;
  linkedinPosts: Array<{ content?: string; summary?: string; status: string }>;
  mindMaps: Array<{ concept: string; notes?: string }>;
  templates: Array<{ generatedContent?: string; status: string }>;
};

function buildContextSection(context: PostContext): string {
  let contextString = '';

  if (context.textContext?.length > 0) {
    contextString += '\n\n=== Reference Notes ===\n';
    context.textContext.forEach((text, index) => {
      contextString += `\n[Note ${index + 1}]\n${text}\n`;
    });
  }

  if (context.youtubeTranscripts?.length > 0) {
    contextString += '\n\n=== YouTube Video Transcripts ===\n';
    context.youtubeTranscripts.forEach((video, index) => {
      if (video.transcript && video.status === 'success') {
        contextString += `\n[Video ${index + 1}]\n${video.transcript.substring(0, 2000)}...\n`;
      }
    });
  }

  if (context.voiceTranscripts?.length > 0) {
    contextString += '\n\n=== Voice Notes ===\n';
    context.voiceTranscripts.forEach((voice, index) => {
      if (voice.transcript && voice.status === 'success') {
        contextString += `\n[Voice Note ${index + 1}]\n${voice.transcript}\n`;
      }
    });
  }

  if (context.pdfDocuments?.length > 0) {
    contextString += '\n\n=== Documents ===\n';
    context.pdfDocuments.forEach((pdf, index) => {
      if (pdf.status === 'success' && pdf.parsedText) {
        contextString += `\n[Document ${index + 1} - ${pdf.fileName || 'Untitled'}]\n${pdf.parsedText.substring(0, 3000)}...\n`;
      }
    });
  }

  if (context.images?.length > 0) {
    contextString += '\n\n=== Image Insights ===\n';
    context.images.forEach((image, index) => {
      if (image.status === 'success') {
        contextString += `\n[Image ${index + 1}]\n`;
        if (image.description) contextString += `Description: ${image.description}\n`;
        if (image.ocrText) contextString += `Text: ${image.ocrText}\n`;
      }
    });
  }

  if (context.webpages?.length > 0) {
    contextString += '\n\n=== Web Articles ===\n';
    context.webpages.forEach((webpage, index) => {
      if (webpage.status === 'success') {
        contextString += `\n[Article ${index + 1}`;
        if (webpage.pageTitle) contextString += ` - ${webpage.pageTitle}`;
        contextString += ']\n';
        if (webpage.pageContent) contextString += `${webpage.pageContent.substring(0, 2000)}...\n`;
      }
    });
  }

  if (context.instagramReels?.length > 0) {
    contextString += '\n\n=== Instagram Content ===\n';
    context.instagramReels.forEach((reel, index) => {
      if (reel.status === 'success') {
        contextString += `\n[Reel ${index + 1}]\n`;
        if (reel.caption) contextString += `Caption: ${reel.caption}\n`;
        if (reel.summary) contextString += `Summary: ${reel.summary}\n`;
      }
    });
  }

  if (context.linkedinPosts?.length > 0) {
    contextString += '\n\n=== Example LinkedIn Posts ===\n';
    context.linkedinPosts.forEach((post, index) => {
      if (post.status === 'success' && post.content) {
        contextString += `\n[Post ${index + 1}]\n${post.content}\n`;
      }
    });
  }

  if (context.mindMaps?.length > 0) {
    contextString += '\n\n=== Key Ideas ===\n';
    context.mindMaps.forEach((mindMap, index) => {
      contextString += `\n[Idea ${index + 1}] ${mindMap.concept}\n`;
      if (mindMap.notes) contextString += `${mindMap.notes}\n`;
    });
  }

  if (context.templates?.length > 0) {
    contextString += '\n\n=== Template Content ===\n';
    context.templates.forEach((template, index) => {
      if (template.status === 'success' && template.generatedContent) {
        contextString += `\n[Template ${index + 1}]\n${template.generatedContent}\n`;
      }
    });
  }

  return contextString;
}

function getVoiceToneInstructions(voiceTone: LinkedInCreatorNodeData['voiceTone']): string {
  const tones = {
    professional: 'Use a formal, business-professional tone. Be authoritative and credible.',
    casual: 'Use a friendly, conversational tone. Be approachable and relatable.',
    inspirational: 'Use an uplifting, motivational tone. Inspire and encourage the reader.',
    'thought-leadership': 'Use an insightful, expert tone. Demonstrate deep industry knowledge and forward-thinking perspectives.',
    humorous: 'Use a light, witty tone. Make the reader smile while delivering value.',
    educational: 'Use a clear, instructive tone. Focus on teaching and explaining concepts.',
    storytelling: 'Use a narrative, engaging tone. Draw the reader in with compelling stories.',
  };

  return tones[voiceTone || 'professional'] || tones.professional;
}

function getFormatInstructions(format?: string): string {
  const formats: Record<string, string> = {
    storytelling: 'Structure the post as a compelling narrative with a beginning, middle, and end. Use storytelling techniques to engage the reader.',
    listicle: 'Format as a numbered list (e.g., "5 ways to...", "3 reasons why..."). Make each point clear and actionable.',
    'question-based': 'Start with a thought-provoking question. Explore the question and provide insights or perspectives.',
    'personal-story': 'Share a personal experience or anecdote. Make it relatable and draw lessons from it.',
    'case-study': 'Present a specific example or case study. Include the situation, challenge, solution, and results.',
    'how-to': 'Provide step-by-step guidance on how to achieve something. Be practical and actionable.',
  };

  return formats[format || 'storytelling'] || formats.storytelling;
}

function getLineBreakInstructions(style?: string): string {
  const styles: Record<string, string> = {
    minimal: 'Use minimal line breaks. Keep paragraphs dense and compact.',
    moderate: 'Use moderate spacing. Break into paragraphs of 2-3 sentences for readability.',
    generous: 'Use generous spacing. Use single-line paragraphs and plenty of white space for maximum readability.',
  };

  return styles[style || 'moderate'] || styles.moderate;
}

function getCTAInstructions(settings?: LinkedInCreatorNodeData['styleSettings']): string {
  if (!settings?.includeCTA) return '';

  const ctas: Record<string, string> = {
    comment: 'End with a question that encourages comments and discussion.',
    share: 'Encourage readers to share if they found value.',
    link: 'Include a clear call to action to visit a link or resource.',
    dm: 'Invite readers to message you for more information.',
    custom: settings.customCTA || 'Include a relevant call to action.',
  };

  return `\n\nCall-to-Action: ${ctas[settings.ctaType || 'comment'] || ctas.comment}`;
}

async function postHandler(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to generate posts');
  }

  try {
    const {
      topic,
      voiceTone,
      styleSettings,
      uploadedFiles,
      context,
      aiInstructions,
    } = (await req.json()) as {
      topic: string;
      voiceTone: LinkedInCreatorNodeData['voiceTone'];
      styleSettings: LinkedInCreatorNodeData['styleSettings'];
      uploadedFiles?: LinkedInCreatorNodeData['uploadedFiles'];
      context: PostContext;
      aiInstructions?: string;
    };

    console.log('[LinkedIn Generate Post] Request received:', {
      topic: topic?.substring(0, 50) + '...',
      voiceTone,
      styleSettings: {
        format: styleSettings?.format,
        lineBreakStyle: styleSettings?.lineBreakStyle,
        targetLength: styleSettings?.targetLength,
        useEmojis: styleSettings?.useEmojis,
        hashtagCount: styleSettings?.hashtagCount,
        includeCTA: styleSettings?.includeCTA,
        ctaType: styleSettings?.ctaType,
      },
      uploadedFilesCount: uploadedFiles?.length || 0,
      contextCounts: {
        textContext: context?.textContext?.length || 0,
        youtubeTranscripts: context?.youtubeTranscripts?.length || 0,
        voiceTranscripts: context?.voiceTranscripts?.length || 0,
        pdfDocuments: context?.pdfDocuments?.length || 0,
        images: context?.images?.length || 0,
        webpages: context?.webpages?.length || 0,
        instagramReels: context?.instagramReels?.length || 0,
        linkedinPosts: context?.linkedinPosts?.length || 0,
        mindMaps: context?.mindMaps?.length || 0,
        templates: context?.templates?.length || 0,
      },
      hasAiInstructions: !!aiInstructions,
    });

    if (!topic || topic.trim().length < 5) {
      return NextResponse.json({ error: 'Topic must be at least 5 words' }, { status: 400 });
    }

    // Try OpenAI first (via OpenRouter), fallback to Gemini
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!openrouterKey && !geminiKey) {
      return NextResponse.json(
        { error: 'No AI API keys configured. Set OPENROUTER_API_KEY or GEMINI_API_KEY' },
        { status: 500 }
      );
    }

    // Prefer OpenAI via OpenRouter
    const useOpenAI = !!openrouterKey;
    console.log('[LinkedIn Generate Post] Using AI provider:', useOpenAI ? 'OpenAI (OpenRouter)' : 'Gemini');

    // Build additional context from uploaded files
    let fileContext = '';
    if (uploadedFiles && uploadedFiles.length > 0) {
      console.log('[LinkedIn Generate Post] Processing uploaded files:',
        uploadedFiles.map((f, i) => ({
          index: i,
          type: f.type,
          extractionStatus: f.extractionStatus,
          hasExtractedTopic: !!f.extractedTopic,
          topicLength: f.extractedTopic?.length || 0,
        }))
      );

      fileContext += '\n\n=== Uploaded File Topics ===\n';
      uploadedFiles.forEach((file, index) => {
        if (file.extractedTopic && file.extractionStatus === 'success') {
          fileContext += `\n[${file.type} ${index + 1}]\n${file.extractedTopic}\n`;
        }
      });

      console.log('[LinkedIn Generate Post] File context built:', {
        fileContextLength: fileContext.length,
        hasContent: fileContext.length > 50,
      });
    }

    let generatedText = '';
    let finishReason: string | undefined;

    const targetLength = styleSettings?.targetLength || 900;
    const contextSection = buildContextSection(context);
    const voiceToneInstruction = getVoiceToneInstructions(voiceTone);
    const formatInstruction = getFormatInstructions(styleSettings?.format);
    const lineBreakInstruction = getLineBreakInstructions(styleSettings?.lineBreakStyle);
    const ctaInstruction = getCTAInstructions(styleSettings);

    const systemPrompt = `You are an expert LinkedIn storyteller and copywriter who crafts emotionally engaging, high-performing posts designed for maximum readability and connection.

Your task is to write a LinkedIn post following the Story → Lesson → Steps → Reminder flow, using short, punchy lines and conversational rhythm.

NEVER use EM dashes (—) — use commas or periods instead.

📋 STRUCTURE TO FOLLOW:

1. Hook (Pattern Interrupt)
   - Goal: Stop the scroll with emotion or curiosity
   - 1–2 short sentences max
   - Use bold statements, relatable truths, or personal story openers
   - Keep it simple, emotional, contrast-driven

2. Context or Setup
   - Goal: Build the bridge to value
   - 2–4 short, conversational sentences
   - Explain the situation, tension, or belief behind the post
   - Create anticipation for what's next

3. Transition Line
   - Goal: Signal the actionable insight
   - Example: "Here's what I learned…" / "Here's how to fix it…" / "Here's my 3-step formula…"
   - This line converts emotion into logic-driven curiosity

4. Framework / Steps / Insights
   - Goal: Deliver clear, skimmable, practical value
   - Use a numbered list (1–5 points typical)
   - Each point includes:
     • A short headline-style idea
     • Supporting explanation
     • A mini example or illustration
   - Use the visual rhythm marker "↳" for sub-points
   - Keep each step distinct, clear, and useful

5. Core Rule / Recap
   - Goal: Reinforce the takeaway
   - One short, memorable sentence summarizing the core lesson

6. Emotional or Motivational Wrap-up
   - Goal: End with impact
   - 1–2 hopeful or reflective lines
   - Inspire or reaffirm belief
   - Keep it human and real — never salesy

🎯 STYLE RULES:
- Tone: ${voiceToneInstruction}
- Use short lines (1–2 sentences per paragraph)
- NO EM dashes at all. Use commas, periods, or colons instead
- Maintain readability, rhythm, and emotional flow
- ${styleSettings?.useEmojis ? 'Use emojis sparingly (0–1 max per section)' : 'Do NOT use any emojis'}
- Use plain, direct language over corporate buzzwords
- Target length: approximately ${targetLength} characters
- ${lineBreakInstruction}

${(styleSettings?.hashtagCount || 0) > 0 ? `\n📌 HASHTAGS:\n- Include exactly ${styleSettings?.hashtagCount} relevant hashtag${(styleSettings?.hashtagCount || 0) > 1 ? 's' : ''} at the end of the post\n` : ''}

${ctaInstruction ? `\n💬 CALL-TO-ACTION:\n${ctaInstruction}\n` : ''}

${aiInstructions ? `\n📝 ADDITIONAL INSTRUCTIONS:\n${aiInstructions}\n` : ''}

${contextSection || fileContext ? `\n📚 CONTEXT TO USE:\n${contextSection}${fileContext}\n` : ''}

🎯 TOPIC: ${topic}

IMPORTANT: Write ONLY the LinkedIn post content. Do not include any explanations, titles, or meta-commentary. Start writing the post directly following the Story → Lesson → Steps → Reminder structure.

POST:`;

    if (useOpenAI && openrouterKey) {
      // Use OpenAI via OpenRouter
      const openai = new OpenAI({
        apiKey: openrouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://remalt.com',
          'X-Title': process.env.NEXT_PUBLIC_APP_NAME || 'Remalt',
        },
      });

      // Calculate appropriate token limit
      // 1 token ≈ 0.75 characters, so we need more tokens than chars
      // Add buffer for formatting, emojis, hashtags (3x multiplier)
      const targetChars = styleSettings?.targetLength || 900;
      const estimatedTokens = Math.ceil((targetChars * 3) / 0.75);
      const maxTokens = Math.max(2048, estimatedTokens);

      console.log('[LinkedIn Generate Post] Calling OpenAI via OpenRouter:', {
        model: 'openai/gpt-4o-mini',
        promptLength: systemPrompt.length,
        targetChars,
        maxTokens,
      });

      const completion = await openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: systemPrompt }],
        temperature: 0.85,
        max_tokens: maxTokens,
      });

      generatedText = completion.choices[0]?.message?.content || '';
      finishReason = completion.choices[0]?.finish_reason;

      console.log('[LinkedIn Generate Post] OpenAI response:', {
        finishReason,
        responseLength: generatedText.length,
        firstChars: generatedText.substring(0, 100) + '...',
        lastChars: '...' + generatedText.substring(Math.max(0, generatedText.length - 100)),
      });

      // Check if response was cut off
      if (finishReason === 'length') {
        console.warn('[LinkedIn Generate Post] ⚠️ Response was cut off due to length limit');
        // You can still use the response, but warn the user
      }

      if (!generatedText || generatedText.trim().length === 0) {
        return NextResponse.json(
          { error: 'OpenAI returned an empty response. Please try again.' },
          { status: 500 }
        );
      }
    } else {
      // Use Gemini as fallback
      if (!geminiKey) {
        return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
      }

      // Calculate appropriate token limit for Gemini
      const targetChars = styleSettings?.targetLength || 900;
      const estimatedTokens = Math.ceil((targetChars * 3) / 0.75);
      const maxOutputTokens = Math.max(2048, estimatedTokens);

      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens,
          topP: 0.95,
          topK: 40,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_ONLY_HIGH',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_ONLY_HIGH',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_ONLY_HIGH',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH',
          },
        ],
      });

      console.log('[LinkedIn Generate Post] Calling Gemini API with:', {
        model: 'gemini-2.5-flash',
        promptLength: systemPrompt.length,
        targetChars,
        maxOutputTokens,
      });

      const result = await model.generateContent(systemPrompt);

      // Log full response structure for debugging
      const candidate = result.response.candidates?.[0];
      console.log('[LinkedIn Generate Post] Raw Gemini response:', {
        candidates: result.response.candidates?.length,
        finishReason: candidate?.finishReason,
        safetyRatings: candidate?.safetyRatings,
        hasContent: !!candidate?.content,
        parts: candidate?.content?.parts?.length,
        promptFeedback: result.response.promptFeedback,
        fullCandidate: JSON.stringify(candidate, null, 2).substring(0, 500),
      });

      // Check for prompt feedback (blocked before generation)
      if (result.response.promptFeedback?.blockReason) {
        console.error('[LinkedIn Generate Post] Prompt blocked:', result.response.promptFeedback);
        return NextResponse.json(
          {
            error: `Content blocked: ${result.response.promptFeedback.blockReason}. Please try a different topic.`,
          },
          { status: 400 }
        );
      }

      // Check for empty response
      if (!candidate) {
        console.error('[LinkedIn Generate Post] No candidates in response');
        return NextResponse.json(
          { error: 'No response generated. Please try again with a different topic.' },
          { status: 500 }
        );
      }

      if (candidate.finishReason === 'SAFETY') {
        console.error('[LinkedIn Generate Post] Content blocked by safety filters:', {
          finishReason: candidate.finishReason,
          safetyRatings: candidate.safetyRatings,
        });
        return NextResponse.json(
          {
            error:
              'Content generation was blocked by safety filters. Try rephrasing your topic or removing sensitive keywords.',
          },
          { status: 400 }
        );
      }

      // Try multiple ways to extract text
      // Method 1: Direct text() call on response
      try {
        generatedText = result.response.text();
        console.log('[LinkedIn Generate Post] Extracted using text() method');
      } catch (e) {
        console.warn('[LinkedIn Generate Post] text() method failed:', e);
      }

      // Method 2: Access candidate content parts
      if (!generatedText && candidate?.content?.parts?.[0]?.text) {
        generatedText = candidate.content.parts[0].text;
        console.log('[LinkedIn Generate Post] Extracted from parts[0].text');
      }

      // Method 3: Check if content itself has text
      if (!generatedText && candidate?.content && typeof candidate.content === 'object') {
        const contentObj = candidate.content as any;
        if (contentObj.text) {
          generatedText = contentObj.text;
          console.log('[LinkedIn Generate Post] Extracted from content.text');
        }
      }

      // Method 4: Try to stringify and parse
      if (!generatedText && candidate) {
        console.error(
          '[LinkedIn Generate Post] All extraction methods failed. Full candidate:',
          JSON.stringify(candidate, null, 2)
        );
      }

      if (!generatedText || generatedText.trim().length === 0) {
        console.error('[LinkedIn Generate Post] Empty response after all extraction attempts:', {
          finishReason: candidate?.finishReason,
          hasCandidate: !!candidate,
          hasContent: !!candidate?.content,
          contentType: typeof candidate?.content,
          hasParts: !!candidate?.content?.parts,
          partsLength: candidate?.content?.parts?.length,
        });
        return NextResponse.json(
          { error: 'Generated an empty response. Please try again or use a different topic.' },
          { status: 500 }
        );
      }

      // Check if response was cut off
      finishReason = candidate?.finishReason;
      if (finishReason === 'MAX_TOKENS') {
        console.warn('[LinkedIn Generate Post] ⚠️ Gemini response was cut off due to MAX_TOKENS');
        // Continue with partial response but log warning
      }

      console.log('[LinkedIn Generate Post] Gemini API response received:', {
        finishReason,
        responseLength: generatedText.length,
        firstChars: generatedText.substring(0, 100) + '...',
        lastChars: '...' + generatedText.substring(Math.max(0, generatedText.length - 100)),
      });
    }

    // Clean up the response - remove any markdown code blocks or meta commentary
    let cleanedText = generatedText
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/^Here's.*?:\s*/i, '') // Remove "Here's a post:" type prefixes
      .replace(/^I've created.*?:\s*/i, '') // Remove "I've created..." type prefixes
      .trim();

    const characterCount = cleanedText.length;

    console.log('[LinkedIn Generate Post] ✅ Success:', {
      characterCount,
      cleanedLength: cleanedText.length,
      rawLength: generatedText.length,
      previewStart: cleanedText.substring(0, 100) + '...',
      previewEnd: '...' + cleanedText.substring(Math.max(0, cleanedText.length - 100)),
    });

    // Check if response was cut off and add warning
    let warningMessage: string | undefined;
    if (finishReason === 'length' || finishReason === 'MAX_TOKENS') {
      warningMessage = 'Response may be incomplete due to length limit. Try reducing context or target length.';
      console.warn('[LinkedIn Generate Post] ⚠️ Adding warning to user:', warningMessage);
    }

    return NextResponse.json({
      content: cleanedText,
      plainText: cleanedText,
      characterCount,
      status: 'success',
      warning: warningMessage,
    });
  } catch (error: unknown) {
    console.error('[LinkedIn Generate Post] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate post';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = postHandler;
