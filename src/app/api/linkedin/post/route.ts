import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';

const APIFY_API_KEY = process.env.APIFY_API_KEY || process.env.APIFY_API_TOKEN;

if (!APIFY_API_KEY) {
  console.warn('[LinkedIn API] APIFY_API_KEY/APIFY_API_TOKEN not set - LinkedIn fetching will fail');
}

const client = new ApifyClient({
  token: APIFY_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: url' },
        { status: 400 }
      );
    }

    if (!APIFY_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'APIFY_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log(`[LinkedIn API] Fetching post data for URL: ${url}`);

    // Run the Apify actor: supreme_coder/linkedin-post
    // The actor expects 'urls' as an array
    const run = await client.actor('supreme_coder/linkedin-post').call({
      urls: [url],
    });

    console.log(`[LinkedIn API] Apify run ID: ${run.id}, status: ${run.status}`);

    // Get the results from the run
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items || items.length === 0) {
      console.error('[LinkedIn API] No data returned from Apify');
      return NextResponse.json(
        { success: false, error: 'No data found for this LinkedIn post' },
        { status: 404 }
      );
    }

    const postData = items[0];
    console.log('[LinkedIn API] Raw Apify data:', JSON.stringify(postData, null, 2));

    // Map Apify response to our format
    const response = {
      success: true,
      url,
      postId: postData.postId || postData.activityId || extractPostId(url),
      content: postData.text || postData.commentary || postData.content || '',
      imageUrl: postData.imageUrl || selectBestImage(postData.images) || undefined,
      videoUrl: postData.videoUrl || postData.video || undefined,
      author: {
        name: postData.authorName || postData.author?.name || undefined,
        headline: postData.authorHeadline || postData.author?.headline || undefined,
        profileUrl: postData.authorProfileUrl || postData.author?.profileUrl || undefined,
        profilePicUrl: postData.authorProfilePicture || postData.author?.profilePicture || undefined,
      },
      reactions: postData.likesCount ||
                 (Array.isArray(postData.reactions) ? postData.reactions.length : postData.reactions) ||
                 postData.numLikes || 0,
      comments: postData.commentsCount || postData.numComments || 0,
      reposts: postData.repostsCount || postData.numReposts || postData.numShares || 0,
      postType: determinePostType(postData),
    };

    console.log('[LinkedIn API] Mapped response:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[LinkedIn API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch LinkedIn post'
      },
      { status: 500 }
    );
  }
}

function selectBestImage(images?: string[]): string | undefined {
  if (!images || images.length === 0) return undefined;

  // LinkedIn image URLs contain size hints in the path
  // Priority order: shrink_2048 > shrink_1280 > shrink_800 > shrink_480 > shrink_160 > shrink_20
  // We want the largest available image for best quality

  const sizePreference = [
    'shrink_2048',
    'feedshare-shrink_2048',
    'shrink_1280',
    'feedshare-shrink_1280',
    'shrink_800',
    'feedshare-shrink_800',
    'shrink_480',
    'feedshare-shrink_480',
  ];

  // Try to find images matching preferred sizes in order
  for (const sizeHint of sizePreference) {
    const found = images.find(url => url.includes(sizeHint));
    if (found) {
      console.log(`[LinkedIn API] Selected image with size: ${sizeHint}`);
      return found;
    }
  }

  // Fallback: return the first image if no size match found
  console.log('[LinkedIn API] No size match found, using first image');
  return images[0];
}

function extractPostId(url: string): string {
  const patterns = [
    /linkedin\.com\/posts\/[^_]+_([^/?]+)/,
    /linkedin\.com\/feed\/update\/urn:li:activity:(\d+)/,
    /activity[:-](\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return url;
}

function determinePostType(data: any): string {
  if (data.videoUrl || data.video) return 'Video';
  if (data.imageUrl || data.images?.length > 0) return 'Image';
  if (data.articleUrl || data.article) return 'Article';
  if (data.pollOptions) return 'Poll';
  return 'Text';
}
