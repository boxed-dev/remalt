/**
 * Supadata API client for YouTube transcription
 * API Documentation: https://api.supadata.ai
 */

interface SupadataTranscriptResponse {
  content?: string; // Primary transcript field from Supadata
  lang?: string; // Language code
  availableLangs?: string[]; // Available languages
  error?: string;
  message?: string;
}

interface TranscriptResult {
  success: boolean;
  transcript?: string;
  error?: string;
}

/**
 * Fetch YouTube transcript using Supadata API
 * @param videoUrl - Full YouTube video URL
 * @returns Transcript text or error
 */
export async function fetchSupadataTranscript(
  videoUrl: string
): Promise<TranscriptResult> {
  const apiKey = process.env.SUPADATA_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'SUPADATA_API_KEY is not configured',
    };
  }

  try {
    // Encode the URL for the query parameter
    const encodedUrl = encodeURIComponent(videoUrl);

    // Build API URL with parameters
    const apiUrl = `https://api.supadata.ai/v1/transcript?url=${encodedUrl}&text=true&mode=native`;

    console.log('[Supadata] Fetching transcript for:', videoUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Supadata] API error:', response.status, errorText);

      return {
        success: false,
        error: `Supadata API error: ${response.status} - ${errorText}`,
      };
    }

    const data: SupadataTranscriptResponse = await response.json();

    // Handle error in response
    if (data.error || data.message) {
      return {
        success: false,
        error: data.error || data.message || 'Unknown error from Supadata',
      };
    }

    // Extract transcript from content field
    const transcriptText = data.content?.trim();

    if (!transcriptText) {
      return {
        success: false,
        error: 'No transcript available for this video',
      };
    }

    console.log('[Supadata] Successfully fetched transcript, length:', transcriptText.length);

    return {
      success: true,
      transcript: transcriptText,
    };
  } catch (error) {
    console.error('[Supadata] Error fetching transcript:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
