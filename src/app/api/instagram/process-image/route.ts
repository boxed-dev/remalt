import { NextResponse } from 'next/server';
import { processInstagramImage } from '@/lib/instagram-processor';

async function postHandler(request: Request) {
  try {
    const { imageUrl, postCode, caption } = await request.json();

    if (!imageUrl || !postCode) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: imageUrl, postCode' },
        { status: 400 }
      );
    }

    console.log(`[API /instagram/process-image] Processing image for post: ${postCode}`);

    const result = await processInstagramImage(imageUrl, postCode, caption);

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('[API /instagram/process-image] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process Instagram image'
      },
      { status: 500 }
    );
  }
}

export const POST = postHandler;
