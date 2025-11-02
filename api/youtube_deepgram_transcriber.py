#!/usr/bin/env python3
"""
YouTube to Deepgram Transcriber - Production Ready
Supports Deepgram SDK v5+
"""

import os
import sys
import subprocess
import tempfile
import json
import shutil
import glob
from typing import Optional, Tuple
from dotenv import load_dotenv
from deepgram import DeepgramClient
import sentry_sdk

# Load .env for API key and optional proxy
load_dotenv()

SENTRY_DSN = os.getenv("SENTRY_PYTHON_DSN") or os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '0.1')),
        profiles_sample_rate=float(os.getenv('SENTRY_PROFILES_SAMPLE_RATE', '0.0')),
        environment=os.getenv('SENTRY_ENVIRONMENT') or os.getenv('PYTHON_ENV') or 'development',
        send_default_pii=False,
    )

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
YTDLP_PROXY = os.getenv("YTDLP_PROXY")
COOKIES_FILE = os.getenv("COOKIES_FILE", "cookies.txt")
YT_PO_TOKEN = os.getenv("YT_PO_TOKEN")
YT_VISITOR_DATA = os.getenv("YT_VISITOR_DATA")

if not DEEPGRAM_API_KEY:
    print("ERROR: DEEPGRAM_API_KEY environment variable is required", file=sys.stderr)
    print("Add it to your .env file: DEEPGRAM_API_KEY=your_key_here", file=sys.stderr)
    sys.exit(1)

def _detect_mimetype(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    mimetypes = {
        '.mp3': 'audio/mpeg', '.mpeg': 'audio/mpeg',
        '.m4a': 'audio/mp4', '.aac': 'audio/aac',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg', '.oga': 'audio/ogg',
        '.webm': 'audio/webm',
        '.flac': 'audio/flac',
    }
    return mimetypes.get(ext, 'application/octet-stream')

def download_youtube_audio(youtube_url: str, output_template: str):
    """
    Downloads audio using yt-dlp with aggressive bot bypass for cloud servers.
    Uses multiple strategies in order of reliability for headless environments.
    """
    # Base command that works on most servers
    base_cmd = [
        'yt-dlp',
        '--no-check-certificates',  # Bypass SSL issues on some servers
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '0',  # Best quality
        '--output', output_template,
        '--no-playlist',
        '--max-downloads', '1',
        '-N', '8',
        '--force-ipv4',
        '--no-warnings',
        '--ignore-errors',
    ]

    strategies = []

    # Strategy 1: Use po_token + visitor_data (MOST RELIABLE for servers, see setup below)
    if YT_PO_TOKEN and YT_VISITOR_DATA:
        strategies.append({
            'name': 'PO Token + Visitor Data',
            'extra_args': [
                '--extractor-args', f'youtube:po_token={YT_PO_TOKEN};visitor_data={YT_VISITOR_DATA}'
            ]
        })

    # Strategy 2: Use cookies.txt file (BEST for cloud without manual browser)
    if os.path.exists(COOKIES_FILE):
        strategies.append({
            'name': 'Cookies File',
            'extra_args': ['--cookies', COOKIES_FILE]
        })

    # Strategy 3: iOS client (often works without auth)
    strategies.append({
        'name': 'iOS Client',
        'extra_args': ['--extractor-args', 'youtube:player_client=ios,ios_music']
    })

    # Strategy 4: TV Embedded client (no age restriction)
    strategies.append({
        'name': 'TV Embedded',
        'extra_args': ['--extractor-args', 'youtube:player_client=tv_embedded']
    })

    # Strategy 5: mweb client (mobile web, lightweight)
    strategies.append({
        'name': 'Mobile Web',
        'extra_args': ['--extractor-args', 'youtube:player_client=mweb']
    })

    # Strategy 6: Android with testsuite
    strategies.append({
        'name': 'Android TestSuite',
        'extra_args': ['--extractor-args', 'youtube:player_client=android,android_testsuite']
    })

    # Strategy 7: Web client with bypass
    strategies.append({
        'name': 'Web Client',
        'extra_args': ['--extractor-args', 'youtube:player_client=web', '--extractor-args', 'youtube:player_skip=webpage,configs,js']
    })

    last_error = None

    for strategy in strategies:
        cmd = base_cmd + strategy['extra_args'] + [youtube_url]

        # Add proxy if configured
        if YTDLP_PROXY:
            cmd.extend(['--proxy', YTDLP_PROXY])

        print(f"\n[yt-dlp] Trying: {strategy['name']}...", file=sys.stderr)
        sentry_sdk.add_breadcrumb(
            category='yt-dlp',
            message='Attempting download strategy',
            data={'strategy': strategy['name']},
        )

        try:
            result = subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=120)
            print(f"[yt-dlp] ✅ SUCCESS with {strategy['name']}", file=sys.stderr)
            sentry_sdk.add_breadcrumb(
                category='yt-dlp',
                message='Download success',
                data={'strategy': strategy['name'], 'stdout': result.stdout[:200]},
                level='info',
            )
            return
        except subprocess.TimeoutExpired:
            print(f"[yt-dlp] ⏱️  Timeout with {strategy['name']}", file=sys.stderr)
            last_error = "Download timeout"
            continue
        except subprocess.CalledProcessError as e:
            last_error = e
            error_lower = e.stderr.lower()

            # Detect specific error types
            if 'bot' in error_lower or 'sign in' in error_lower:
                print(f"[yt-dlp] 🤖 Bot detection with {strategy['name']}", file=sys.stderr)
            elif 'unavailable' in error_lower or 'private' in error_lower:
                print(f"[yt-dlp] 🔒 Video unavailable/private", file=sys.stderr)
                break  # No point trying other strategies
            elif 'age' in error_lower:
                print(f"[yt-dlp] 🔞 Age restriction with {strategy['name']}", file=sys.stderr)
            else:
                print(f"[yt-dlp] ❌ Error: {e.stderr[:150]}", file=sys.stderr)
            sentry_sdk.capture_exception(e)
            continue

    # All strategies failed - provide actionable error
    print("\n" + "="*60, file=sys.stderr)
    print("FATAL: All download strategies exhausted", file=sys.stderr)
    print("="*60, file=sys.stderr)

    if last_error and hasattr(last_error, 'stderr'):
        print("\n📋 Last Error Details:", file=sys.stderr)
        print(last_error.stderr[:500], file=sys.stderr)

    print("\n🔧 SETUP INSTRUCTIONS FOR CLOUD:", file=sys.stderr)
    print("\n1️⃣  EASIEST - Export YouTube cookies (5 min setup):", file=sys.stderr)
    print("   • Install browser extension: 'Get cookies.txt LOCALLY'", file=sys.stderr)
    print("   • Go to youtube.com (logged in)", file=sys.stderr)
    print("   • Click extension → Export → Save as cookies.txt", file=sys.stderr)
    print("   • Upload to server and set: COOKIES_FILE=./cookies.txt", file=sys.stderr)
    print("   • Cookies last ~6 months", file=sys.stderr)

    print("\n2️⃣  ADVANCED - Get po_token (permanent fix):", file=sys.stderr)
    print("   • Visit: https://github.com/yt-dlp/yt-dlp/wiki/Extractors#po-token-guide", file=sys.stderr)
    print("   • Extract po_token and visitor_data from browser", file=sys.stderr)
    print("   • Set env vars: YT_PO_TOKEN and YT_VISITOR_DATA", file=sys.stderr)

    print("\n3️⃣  QUICK FIX - Update yt-dlp:", file=sys.stderr)
    print("   • pip install -U yt-dlp", file=sys.stderr)

    print("\n4️⃣  PROXY - If IP is blocked:", file=sys.stderr)
    print("   • Set YTDLP_PROXY=http://user:pass@proxy:port", file=sys.stderr)
    print("="*60 + "\n", file=sys.stderr)

    sys.exit(1)

def _resolve_downloaded_audio(tmpdir: str) -> Tuple[str, str]:
    matches = sorted(glob.glob(os.path.join(tmpdir, 'audio.*')))
    if not matches:
        raise FileNotFoundError('Audio file not found after download. Check yt-dlp and ffmpeg installation.')
    return matches[0], _detect_mimetype(matches[0])

def transcribe_with_deepgram(audio_path: str, mimetype: str):
    """Transcribe audio file with Deepgram SDK v5"""
    with sentry_sdk.start_span(op='deepgram.transcribe', description=os.path.basename(audio_path)) as span:
        client = DeepgramClient()

        with open(audio_path, 'rb') as audio_file:
            buffer_data = audio_file.read()

        # Deepgram SDK v5 simplified API
        response = client.listen.v1.media.transcribe_file(
            request=buffer_data,
            model="nova-2",
            smart_format=True,
            language="en",
            punctuate=True,
            paragraphs=True,
            utterances=True,
        )

        if hasattr(response, 'metadata') and response.metadata:
            span.set_data('duration', response.metadata.duration)
            span.set_data('channels', response.metadata.channels)

        return response

def extract_transcript(result) -> Optional[str]:
    try:
        return result.results.channels[0].alternatives[0].transcript
    except (AttributeError, IndexError, KeyError):
        return None

def main():
    if len(sys.argv) != 2:
        print(f"Usage: python {sys.argv[0]} <YouTube_URL>", file=sys.stderr)
        print(f"Example: python {sys.argv[0]} 'https://youtube.com/watch?v=VIDEO_ID'", file=sys.stderr)
        sys.exit(1)

    youtube_url = sys.argv[1]

    if shutil.which('yt-dlp') is None:
        print('ERROR: yt-dlp not found. Install: pip install -U yt-dlp', file=sys.stderr)
        sys.exit(1)

    if shutil.which('ffmpeg') is None:
        print('WARNING: ffmpeg not found. Install: apt-get install ffmpeg', file=sys.stderr)

    print(f"\n{'='*60}")
    print("YouTube to Deepgram Transcriber")
    print(f"{'='*60}\n")

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            out_tmpl = os.path.join(tmpdir, 'audio.%(ext)s')
            print(f"[1/3] Downloading audio from YouTube...")
            download_youtube_audio(youtube_url, out_tmpl)

            audio_path, mimetype = _resolve_downloaded_audio(tmpdir)
            file_size = os.path.getsize(audio_path) / (1024 * 1024)
            print(f"[2/3] Audio ready: {os.path.basename(audio_path)} ({file_size:.1f}MB, {mimetype})")

            print("[3/3] Transcribing with Deepgram...")
            result = transcribe_with_deepgram(audio_path, mimetype)

            print('\n---RAW RESPONSE---')
            try:
                print(json.dumps(result.to_dict(), indent=2))
            except:
                print(result)

            transcript = extract_transcript(result)
            if transcript:
                print('\n---TRANSCRIPT---')
                print(transcript)
                print(f"\n✅ Success! Transcribed {len(transcript)} characters")
            else:
                print('\n❌ ERROR: Transcript not found in Deepgram response')
                sys.exit(1)

    except KeyboardInterrupt:
        print('\n\n⚠️  Interrupted by user', file=sys.stderr)
        sys.exit(130)
    except Exception as e:
        print(f'\n❌ ERROR: {e}', file=sys.stderr)
        import traceback
        traceback.print_exc()
        sentry_sdk.capture_exception(e)
        sys.exit(1)

if __name__ == "__main__":
    main()
