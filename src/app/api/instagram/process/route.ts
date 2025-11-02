import { NextResponse } from 'next/server';
import { processInstagramVideo } from '@/lib/instagram-processor';

async function postHandler(request: Request) {
  try {
    const body = await request.json();
    const { videoUrl, reelCode } = body;

    if (!videoUrl || !reelCode) {
      return NextResponse.json({ success: false, error: 'Missing videoUrl or reelCode' }, { status: 400 });
    }

    const analysisResult = await processInstagramVideo(videoUrl, reelCode);

    return NextResponse.json({ success: true, ...analysisResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export const POST = postHandler;
