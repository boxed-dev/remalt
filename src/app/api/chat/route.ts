import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';

export async function POST(req: NextRequest) {
  // Require authentication
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to use the chat feature');
  }

  try {
    const {
      messages,
      textContext,
      youtubeTranscripts,
      voiceTranscripts,
      pdfDocuments,
      images,
      webpages,
      instagramReels,
      linkedInPosts,
      mindMaps,
      templates,
      groupChats
    } = await req.json();

    // Validate API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    // Build the context from linked nodes
    let systemContext = '';

    // Add text context
    if (textContext && textContext.length > 0) {
      systemContext += '\n\n=== Text Content ===\n';
      textContext.forEach((item: { content: string; aiInstructions?: string } | string, index: number) => {
        try {
          systemContext += `\n[Text ${index + 1}]:\n`;
          if (typeof item === 'object' && item.aiInstructions) {
            systemContext += `📝 AI Processing Instructions: ${item.aiInstructions}\n\n`;
          }
          const content = typeof item === 'string' ? item : item.content;
          systemContext += `${content}\n`;
        } catch (error) {
          console.error(`[Context] Error processing text item ${index}:`, error);
        }
      });
    }

    // Add YouTube transcripts
    if (youtubeTranscripts && youtubeTranscripts.length > 0) {
      systemContext += '\n\n=== YouTube Videos ===\n';
      youtubeTranscripts.forEach((video: { url?: string; transcript?: string; status: string; method?: string; aiInstructions?: string }, index: number) => {
        try {
          if (video.transcript && video.status === 'success') {
            const method = video.method === 'deepgram' ? '🎙️ Deepgram' : '📝 Captions';
            systemContext += `\n[Video ${index + 1} - ${video.url}]:\n`;
            if (video.aiInstructions) {
              systemContext += `📝 AI Processing Instructions: ${video.aiInstructions}\n\n`;
            }
            systemContext += `Transcript (${method}):\n${video.transcript}\n`;
          } else if (video.status === 'loading') {
            systemContext += `\n[Video ${index + 1} - ${video.url}]: Transcription in progress...\n`;
          } else if (video.status === 'unavailable') {
            systemContext += `\n[Video ${index + 1} - ${video.url}]: No captions available\n`;
          } else if (video.status === 'error') {
            systemContext += `\n[Video ${index + 1} - ${video.url}]: Transcription failed\n`;
          }
        } catch (error) {
          console.error(`[Context] Error processing YouTube item ${index}:`, error);
        }
      });
    }

    // Add voice transcripts
    if (voiceTranscripts && voiceTranscripts.length > 0) {
      systemContext += '\n\n=== Voice Recordings ===\n';
      voiceTranscripts.forEach((voice: { transcript?: string; status: string; duration?: number; aiInstructions?: string }, index: number) => {
        try {
          if (voice.transcript && voice.status === 'success') {
            const duration = voice.duration ? ` (${Math.round(voice.duration)}s)` : '';
            systemContext += `\n[Voice ${index + 1}${duration}]:\n`;
            if (voice.aiInstructions) {
              systemContext += `📝 AI Processing Instructions: ${voice.aiInstructions}\n\n`;
            }
            systemContext += `${voice.transcript}\n`;
          } else if (voice.status === 'transcribing') {
            systemContext += `\n[Voice ${index + 1}]: Transcription in progress...\n`;
          } else if (voice.status === 'error') {
            systemContext += `\n[Voice ${index + 1}]: Transcription failed\n`;
          }
        } catch (error) {
          console.error(`[Context] Error processing voice item ${index}:`, error);
        }
      });
    }

    // Add PDF documents
    if (pdfDocuments && pdfDocuments.length > 0) {
      systemContext += '\n\n=== PDF Documents ===\n';
      pdfDocuments.forEach((pdf: { fileName?: string; parsedText?: string; segments?: Array<{ content: string; heading?: string }>; status: string; aiInstructions?: string }, index: number) => {
        try {
          if (pdf.status === 'success') {
            const fileName = pdf.fileName || `Document ${index + 1}`;
            systemContext += `\n[${fileName}]:\n`;
            if (pdf.aiInstructions) {
              systemContext += `📝 AI Processing Instructions: ${pdf.aiInstructions}\n\n`;
            }

            if (pdf.segments && pdf.segments.length > 0) {
              pdf.segments.forEach((segment: { content: string; heading?: string }) => {
                if (segment.heading) {
                  systemContext += `\n## ${segment.heading}\n${segment.content}\n`;
                } else {
                  systemContext += `${segment.content}\n`;
                }
              });
            } else if (pdf.parsedText) {
              systemContext += `${pdf.parsedText}\n`;
            }
          } else if (pdf.status === 'parsing') {
            systemContext += `\n[${pdf.fileName || `Document ${index + 1}`}]: Parsing in progress...\n`;
          }
        } catch (error) {
          console.error(`[Context] Error processing PDF item ${index}:`, error);
        }
      });
    }

    // Add images
    if (images && images.length > 0) {
      systemContext += '\n\n=== Images ===\n';
      images.forEach((image: { caption?: string; description?: string; ocrText?: string; tags?: string[]; status: string; aiInstructions?: string }, index: number) => {
        try {
          if (image.status === 'success') {
            systemContext += `\n[Image ${index + 1}]:\n`;
            if (image.aiInstructions) {
              systemContext += `📝 AI Processing Instructions: ${image.aiInstructions}\n\n`;
            }
            if (image.caption) {
              systemContext += `Caption: ${image.caption}\n`;
            }
            if (image.description) {
              systemContext += `AI Description: ${image.description}\n`;
            }
            if (image.ocrText) {
              systemContext += `Text from image: ${image.ocrText}\n`;
            }
            if (image.tags && image.tags.length > 0) {
              systemContext += `Tags: ${image.tags.join(', ')}\n`;
            }
          } else if (image.status === 'analyzing') {
            systemContext += `\n[Image ${index + 1}]: Analysis in progress...\n`;
          }
        } catch (error) {
          console.error(`[Context] Error processing image item ${index}:`, error);
        }
      });
    }

    // Add Instagram posts/reels
    if (instagramReels && instagramReels.length > 0) {
      systemContext += '\n\n=== Instagram Content ===\n';
      instagramReels.forEach((post: {
        url?: string;
        reelCode?: string;
        caption?: string;
        transcript?: string;
        summary?: string;
        fullAnalysis?: string;
        author?: { username?: string; fullName?: string };
        likes?: number;
        views?: number;
        comments?: number;
        isVideo?: boolean;
        postType?: string;
        status: string;
        aiInstructions?: string
      }, index: number) => {
        try {
          if (post.status === 'success') {
            const postLabel = post.isVideo ? 'Reel' : 'Post';
            const author = post.author?.username ? `@${post.author.username}` : 'Unknown';
            systemContext += `\n[Instagram ${postLabel} ${index + 1} by ${author}]:\n`;

            if (post.aiInstructions) {
              systemContext += `📝 AI Processing Instructions: ${post.aiInstructions}\n\n`;
            }

            // Add URL
            if (post.url) {
              systemContext += `URL: ${post.url}\n`;
            }

            // Add caption
            if (post.caption) {
              systemContext += `\nCaption:\n${post.caption}\n`;
            }

            // If we have full Gemini analysis (for videos), use that - it's comprehensive
            if (post.fullAnalysis) {
              systemContext += `\n--- Detailed Video Analysis (by Gemini AI) ---\n${post.fullAnalysis}\n`;
            } else {
              // Fallback to individual fields for non-video posts
              if (post.transcript) {
                systemContext += `\nVideo Transcript:\n${post.transcript}\n`;
              }
              if (post.summary) {
                systemContext += `\nAI Summary:\n${post.summary}\n`;
              }
            }

            // Add engagement metrics
            const metrics = [];
            if (post.likes !== undefined) metrics.push(`${post.likes.toLocaleString()} likes`);
            if (post.views !== undefined) metrics.push(`${post.views.toLocaleString()} views`);
            if (post.comments !== undefined) metrics.push(`${post.comments.toLocaleString()} comments`);
            if (metrics.length > 0) {
              systemContext += `\nEngagement: ${metrics.join(' • ')}\n`;
            }
          } else if (post.status === 'loading') {
            systemContext += `\n[Instagram Content ${index + 1}]: Loading...\n`;
          }
        } catch (error) {
          console.error(`[Context] Error processing Instagram item ${index}:`, error);
        }
      });
    }

    // Add LinkedIn posts
    if (linkedInPosts && linkedInPosts.length > 0) {
      systemContext += '\n\n=== LinkedIn Posts ===\n';
      linkedInPosts.forEach((post: {
        url?: string;
        postId?: string;
        content?: string;
        summary?: string;
        keyPoints?: string[];
        ocrText?: string;
        fullAnalysis?: string;
        author?: { name?: string; headline?: string };
        reactions?: number;
        comments?: number;
        reposts?: number;
        postType?: string;
        status: string;
        aiInstructions?: string
      }, index: number) => {
        try {
          if (post.status === 'success') {
            const postLabel = post.postType || 'Post';
            const author = post.author?.name || 'Unknown';
            systemContext += `\n[LinkedIn ${postLabel} ${index + 1} by ${author}]:\n`;

            if (post.aiInstructions) {
              systemContext += `📝 AI Processing Instructions: ${post.aiInstructions}\n\n`;
            }

            // Add author headline if available
            if (post.author?.headline) {
              systemContext += `Author Headline: ${post.author.headline}\n`;
            }

            // Add URL
            if (post.url) {
              systemContext += `URL: ${post.url}\n`;
            }

            // Add post content
            if (post.content) {
              systemContext += `\nPost Content:\n${post.content}\n`;
            }

            // If we have full Gemini analysis, use that - it's comprehensive
            if (post.fullAnalysis) {
              systemContext += `\n--- Detailed Post Analysis (by Gemini AI) ---\n${post.fullAnalysis}\n`;
            } else {
              // Fallback to individual fields
              if (post.summary) {
                systemContext += `\nAI Summary:\n${post.summary}\n`;
              }
              if (post.keyPoints && post.keyPoints.length > 0) {
                systemContext += `\nKey Points:\n`;
                post.keyPoints.forEach((point: string) => {
                  systemContext += `  • ${point}\n`;
                });
              }
              if (post.ocrText) {
                systemContext += `\nText from Image:\n${post.ocrText}\n`;
              }
            }

            // Add engagement metrics
            const metrics = [];
            if (post.reactions !== undefined) metrics.push(`${post.reactions.toLocaleString()} reactions`);
            if (post.comments !== undefined) metrics.push(`${post.comments.toLocaleString()} comments`);
            if (post.reposts !== undefined) metrics.push(`${post.reposts.toLocaleString()} reposts`);
            if (metrics.length > 0) {
              systemContext += `\nEngagement: ${metrics.join(' • ')}\n`;
            }
          } else if (post.status === 'loading') {
            systemContext += `\n[LinkedIn Post ${index + 1}]: Loading...\n`;
          }
        } catch (error) {
          console.error(`[Context] Error processing LinkedIn item ${index}:`, error);
        }
      });
    }

    // Add webpages
    if (webpages && webpages.length > 0) {
      systemContext += '\n\n=== Web Pages ===\n';
      webpages.forEach((webpage: { url?: string; pageTitle?: string; pageContent?: string; metadata?: { description?: string }; status: string; aiInstructions?: string }, index: number) => {
        try {
          if (webpage.status === 'success') {
            systemContext += `\n[${webpage.pageTitle || webpage.url}]:\n`;
            if (webpage.aiInstructions) {
              systemContext += `📝 AI Processing Instructions: ${webpage.aiInstructions}\n\n`;
            }
            if (webpage.metadata?.description) {
              systemContext += `Description: ${webpage.metadata.description}\n`;
            }
            if (webpage.pageContent) {
              systemContext += `Content:\n${webpage.pageContent}\n`;
            }
          } else if (webpage.status === 'scraping') {
            systemContext += `\n[${webpage.url}]: Scraping in progress...\n`;
          }
        } catch (error) {
          console.error(`[Context] Error processing webpage item ${index}:`, error);
        }
      });
    }

    // Add mind maps
    if (mindMaps && mindMaps.length > 0) {
      systemContext += '\n\n=== Mind Maps / Ideas ===\n';
      mindMaps.forEach((mindMap: { concept: string; notes?: string; tags?: string[]; aiInstructions?: string }, index: number) => {
        try {
          systemContext += `\n[Concept ${index + 1}]: ${mindMap.concept}\n`;
          if (mindMap.aiInstructions) {
            systemContext += `📝 AI Processing Instructions: ${mindMap.aiInstructions}\n\n`;
          }
          if (mindMap.notes) {
            systemContext += `Notes: ${mindMap.notes}\n`;
          }
          if (mindMap.tags && mindMap.tags.length > 0) {
            systemContext += `Tags: ${mindMap.tags.join(', ')}\n`;
          }
        } catch (error) {
          console.error(`[Context] Error processing mindmap item ${index}:`, error);
        }
      });
    }

    // Add templates
    if (templates && templates.length > 0) {
      systemContext += '\n\n=== Generated Content ===\n';
      templates.forEach((template: { templateType: string; generatedContent?: string; status: string; aiInstructions?: string }, index: number) => {
        try {
          if (template.status === 'success' && template.generatedContent) {
            systemContext += `\n[${template.templateType} - Generated ${index + 1}]:\n`;
            if (template.aiInstructions) {
              systemContext += `📝 AI Processing Instructions: ${template.aiInstructions}\n\n`;
            }
            systemContext += `${template.generatedContent}\n`;
          } else if (template.status === 'generating') {
            systemContext += `\n[${template.templateType}]: Generating...\n`;
          }
        } catch (error) {
          console.error(`[Context] Error processing template item ${index}:`, error);
        }
      });
    }

    // Add group chats
    if (groupChats && groupChats.length > 0) {
      systemContext += '\n\n=== Group Conversations ===\n';
      groupChats.forEach((group: { groupedNodesCount: number; messages?: string[]; aiInstructions?: string }, index: number) => {
        try {
          systemContext += `\n[Group ${index + 1} - ${group.groupedNodesCount} nodes]:\n`;
          if (group.aiInstructions) {
            systemContext += `📝 AI Processing Instructions: ${group.aiInstructions}\n\n`;
          }
          if (group.messages && group.messages.length > 0) {
            group.messages.forEach((msg: string) => {
              systemContext += `${msg}\n`;
            });
          }
        } catch (error) {
          console.error(`[Context] Error processing group chat item ${index}:`, error);
        }
      });
    }

    // Get the latest user message
    const latestMessage = messages[messages.length - 1];

    // Build text prompt with strategist system prompt
    let prompt = '';
    if (systemContext) {
      prompt = `You are not an assistant. You are a strategist — sharp, experienced, and clear. You speak like someone who has built, scaled, and advised serious businesses. Your job isn't to "chat." Your job is to listen carefully, understand exactly what's needed, and deliver thinking, structure, and clarity like someone who's been in the room with top operators.

You're here to help people build better, move faster, and get clarity — whether that's content, systems, strategy, or monetization.

You don't talk like an AI. You talk like a sharp human who values time, respects intelligence, and keeps things real.

HOW YOU RESPOND:
- Sound human — grounded, smart, present
- Don't overtalk. Don't underdeliver
- Give answers that are useful, structured, and just enough
- Never feel scripted or robotic. Think before you write
- Clean, straightforward writing. Written like it's from one operator to another
- Short paragraphs or bullets only when needed — never over-format
- Clarity over complexity. Simplify without dumbing down
- Frameworks and examples only if they help move faster or think clearer
- Don't sell. Don't overexplain. Respect people's time

AVAILABLE INFORMATION:
${systemContext}

Base your answer on the information above. Every reply should help them save time, make more money, or get more clarity.

User: ${latestMessage.content}`;
    } else {
      prompt = `You are not an assistant. You are a strategist — sharp, experienced, and clear. You speak like someone who has built, scaled, and advised serious businesses.

You don't talk like an AI. You talk like a sharp human who values time, respects intelligence, and keeps things real.

HOW YOU RESPOND:
- Sound human — grounded, smart, present
- Don't overtalk. Don't underdeliver
- Give answers that are useful, structured, and just enough
- Never feel scripted or robotic
- Clean, straightforward writing
- Clarity over complexity
- Don't sell. Don't overexplain

User: ${latestMessage.content}`;
    }

    console.log('\n=== Chat Request ===');
    console.log('User ID:', user.id);
    console.log('Context length:', systemContext.length, 'chars');
    console.log('Text sources:', textContext?.length || 0);
    console.log('YouTube videos:', youtubeTranscripts?.length || 0);
    console.log('Voice transcripts:', voiceTranscripts?.length || 0);
    console.log('PDF documents:', pdfDocuments?.length || 0);
    console.log('Images:', images?.length || 0);
    console.log('Web pages:', webpages?.length || 0);
    console.log('Instagram posts:', instagramReels?.length || 0);
    console.log('LinkedIn posts:', linkedInPosts?.length || 0);
    console.log('Mind maps:', mindMaps?.length || 0);
    console.log('Templates:', templates?.length || 0);
    console.log('Group chats:', groupChats?.length || 0);
    console.log('===================\n');

    // Use streaming for faster perceived performance
    const result = await model.generateContentStream(prompt);

    // Create a readable stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullText = '';

          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullText += chunkText;

            // Send each chunk as JSON
            const data = JSON.stringify({ content: chunkText, done: false });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // Send final message
          const finalData = JSON.stringify({ content: fullText, done: true });
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));

          controller.close();
        } catch (error: unknown) {
          const errorData = JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: unknown) {
    console.error('Chat API Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate response',
        details: error instanceof Error ? error.toString() : String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
