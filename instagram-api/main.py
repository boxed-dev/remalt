#!/usr/bin/env python3
"""
Minimal Instagram Transcription API
Uses Apify for fetching + Deepgram for multilingual transcription
"""

import os
import logging
from datetime import datetime
from typing import Optional, List
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
# Not using Deepgram SDK - direct HTTP API is simpler

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Environment variables
APIFY_TOKEN = os.getenv("APIFY_API_TOKEN")
DEEPGRAM_KEY = os.getenv("DEEPGRAM_API_KEY")

if not APIFY_TOKEN:
    logger.error("APIFY_API_TOKEN not set!")
if not DEEPGRAM_KEY:
    logger.error("DEEPGRAM_API_KEY not set!")

# FastAPI app
app = FastAPI(title="Instagram Transcription API", version="1.0.0")


class TranscribeRequest(BaseModel):
    """Request model."""
    url: str
    language: Optional[str] = None  # Optional: specify language or auto-detect


class TranscribeResponse(BaseModel):
    """Response model."""
    success: bool
    post_code: str
    author: str
    caption: Optional[str]
    transcript: str
    confidence: float
    language_detected: str
    video_size_mb: float
    processing_time_ms: int
    timestamp: str


@app.get("/")
async def root():
    """Health check."""
    return {
        "name": "Instagram Transcription API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "transcribe": "POST /transcribe",
            "health": "GET /health"
        }
    }


@app.get("/health")
async def health():
    """Health check with service status."""
    return {
        "status": "healthy",
        "apify_configured": bool(APIFY_TOKEN),
        "deepgram_configured": bool(DEEPGRAM_KEY),
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_instagram(request: TranscribeRequest):
    """
    Transcribe Instagram video with automatic language detection.
    
    Supports 36+ languages automatically via Deepgram.
    """
    start_time = datetime.now()
    
    if not APIFY_TOKEN or not DEEPGRAM_KEY:
        raise HTTPException(status_code=500, detail="API keys not configured")
    
    try:
        # Step 1: Fetch Instagram data via Apify
        logger.info(f"Fetching Instagram post: {request.url}")
        
        apify_url = f"https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token={APIFY_TOKEN}"
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            apify_response = await client.post(
                apify_url,
                json={
                    "directUrls": [request.url],
                    "resultsLimit": 1,
                }
            )
            
            if apify_response.status_code not in [200, 201]:
                raise HTTPException(status_code=500, detail=f"Apify failed: {apify_response.status_code}")
            
            data = apify_response.json()
            if not data or len(data) == 0:
                raise HTTPException(status_code=404, detail="Instagram post not found")
            
            item = data[0]
            video_url = item.get("videoUrl")
            
            if not video_url:
                raise HTTPException(status_code=400, detail="No video found - post may be image/carousel")
            
            post_code = item.get("shortCode", "unknown")
            author = item.get("ownerUsername", "unknown")
            caption = item.get("caption")
            
            logger.info(f"✓ Post fetched: {post_code} by @{author}")
            
            # Step 2: Download video
            logger.info("Downloading video...")
            
            video_response = await client.get(
                video_url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://www.instagram.com/',
                },
                timeout=120.0
            )
            
            if video_response.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to download video")
            
            video_bytes = video_response.content
            video_size_mb = len(video_bytes) / (1024 * 1024)
            
            logger.info(f"✓ Video downloaded: {video_size_mb:.2f}MB")
            
            # Step 3: Transcribe with Deepgram (direct HTTP API)
            logger.info("Transcribing with Deepgram...")
            
            # Build Deepgram API URL with parameters
            dg_url = "https://api.deepgram.com/v1/listen"
            params = {
                "model": "nova-2",
                "smart_format": "true",
                "punctuate": "true",
            }
            
            # Language detection or specific language
            if request.language:
                params["language"] = request.language
            else:
                params["detect_language"] = "true"
            
            # Direct HTTP request to Deepgram
            dg_response = await client.post(
                dg_url,
                headers={
                    "Authorization": f"Token {DEEPGRAM_KEY}",
                    "Content-Type": "video/mp4",
                },
                params=params,
                content=video_bytes,
                timeout=60.0
            )
            
            if dg_response.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Deepgram failed: {dg_response.status_code}")
            
            dg_json = dg_response.json()
            
            # Extract results
            channel = dg_json["results"]["channels"][0]
            alternative = channel["alternatives"][0]
            
            transcript = alternative.get("transcript", "")
            confidence = alternative.get("confidence", 0.0)
            
            # Get detected language
            language_detected = request.language or "auto-detected"
            if "detected_language" in channel:
                language_detected = channel["detected_language"]
            
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            logger.info(f"✓ Transcription complete: {len(transcript)} chars, {confidence:.2f} confidence")
            
            return TranscribeResponse(
                success=True,
                post_code=post_code,
                author=author,
                caption=caption,
                transcript=transcript,
                confidence=confidence,
                language_detected=language_detected,
                video_size_mb=round(video_size_mb, 2),
                processing_time_ms=processing_time,
                timestamp=datetime.utcnow().isoformat()
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)

