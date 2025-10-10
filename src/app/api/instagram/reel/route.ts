import { NextResponse } from 'next/server';

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_ACTOR_ENDPOINT = 'https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items';

type ApifyInstagramItem = {
  id?: string;
  shortCode?: string;
  caption?: string;
  url?: string;
  displayUrl?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  imageUrl?: string;
  ownerUsername?: string;
  ownerFullName?: string;
  ownerId?: string;
  ownerProfilePicUrl?: string;
  owner?: {
    profile_pic_url?: string;
    profilePicUrl?: string;
  };
  images?: Array<{ url?: string } | string>;
  videoUrl?: string;
  videoUrls?: string[];
  videoDuration?: number;
  commentsCount?: number;
  likesCount?: number;
  videoViewCount?: number;
  videoPlayCount?: number;
  type?: string; // 'Video', 'Image', 'Sidecar' (carousel)
  isVideo?: boolean;
};

function normaliseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('URL is required');
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.toString();
  } catch (error) {
    throw new Error('Invalid Instagram URL');
  }
}

function isStoryUrl(url: string): boolean {
  return /instagram\.com\/stories\//.test(url);
}

function mapApifyItemToResponse(item: ApifyInstagramItem, requestedUrl: string) {
  // Handle both videos (reels) and images (posts)
  const videoUrl = item.videoUrl || item.videoUrls?.[0];
  const isVideo = item.isVideo || item.type === 'Video' || !!videoUrl;

  const profilePic =
    item.ownerProfilePicUrl ||
    item.owner?.profile_pic_url ||
    item.owner?.profilePicUrl ||
    undefined;

  // Try multiple potential thumbnail sources from Apify
  let thumbnail =
    item.displayUrl ||
    item.thumbnailUrl ||
    item.thumbnail ||
    item.imageUrl;

  // If still no thumbnail, try to extract from images array
  if (!thumbnail && Array.isArray(item.images) && item.images.length > 0) {
    const firstImage = item.images[0];
    if (typeof firstImage === 'string') {
      thumbnail = firstImage;
    } else if (firstImage?.url) {
      thumbnail = firstImage.url;
    }
  }

  // Extract ALL images for carousel posts (Sidecar)
  let allImages: string[] | undefined = undefined;
  if (item.type === 'Sidecar' && Array.isArray(item.images) && item.images.length > 0) {
    allImages = item.images.map((img) => {
      if (typeof img === 'string') return img;
      if (img && typeof img === 'object' && 'url' in img) return img.url as string;
      return '';
    }).filter(Boolean);

    console.log(`[Instagram API] Extracted ${allImages.length} carousel images`);
  }

  // For image posts, if no thumbnail found, throw error
  if (!thumbnail && !videoUrl) {
    throw new Error('No media content found for this post');
  }

  const permalink = item.url ?? requestedUrl;
  const thumbnailFallback = permalink ? `https://image.microlink.io/${encodeURIComponent(permalink)}` : undefined;

  return {
    success: true as const,
    url: requestedUrl,
    reelCode: item.shortCode,
    videoUrl: videoUrl || undefined,
    thumbnail,
    thumbnailFallback,
    images: allImages,
    caption: item.caption,
    author: {
      username: item.ownerUsername,
      fullName: item.ownerFullName,
      profilePicUrl: profilePic,
      id: item.ownerId,
    },
    likes: item.likesCount !== undefined && item.likesCount >= 0 ? item.likesCount : undefined,
    views: item.videoViewCount ?? item.videoPlayCount,
    comments: item.commentsCount,
    duration: item.videoDuration,
    rawId: item.id,
    isVideo,
    postType: item.type,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const requestedUrl = normaliseUrl(body?.url ?? '');

    if (!APIFY_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'Instagram integration is not configured' },
        { status: 503 }
      );
    }

    const apifyUrl = new URL(APIFY_ACTOR_ENDPOINT);
    apifyUrl.searchParams.set('token', APIFY_TOKEN);

    // Determine if this is a story or regular post
    const resultsType = isStoryUrl(requestedUrl) ? 'stories' : 'posts';
    console.log(`[Instagram API] Detected ${resultsType} URL:`, requestedUrl);

    const apifyResponse = await fetch(apifyUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        directUrls: [requestedUrl],
        addParentData: false,
        enhanceUserSearchWithFacebookPage: false,
        resultsType,
        resultsLimit: 1,
      }),
      cache: 'no-store',
    });

    if (!apifyResponse.ok) {
      const errorPayload = await apifyResponse.text();
      console.error('Apify request failed:', apifyResponse.status, errorPayload);
      throw new Error('Failed to fetch Instagram post data');
    }

    const data = await apifyResponse.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No data returned for the requested post');
    }

    const item = data[0] as ApifyInstagramItem;

    // Debug logging to see what Apify returns
    console.log('[Instagram API] Raw Apify item:', JSON.stringify(item, null, 2));
    console.log('[Instagram API] displayUrl:', item.displayUrl);
    console.log('[Instagram API] images:', item.images);
    console.log('[Instagram API] url:', item.url);

    const responsePayload = mapApifyItemToResponse(item, requestedUrl);

    console.log('[Instagram API] Mapped response:', JSON.stringify(responsePayload, null, 2));

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Error in /api/instagram/reel:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
