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
      model: 'gemini-2.5-flash',
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

    // Build text prompt
    let prompt = '';
    if (systemContext) {
      prompt = `You are a helpful AI assistant with access to the following information:
${systemContext}

Important: Base your answer on the information provided above.

User question: ${latestMessage.content}`;
    } else {
      prompt = latestMessage.content;
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
