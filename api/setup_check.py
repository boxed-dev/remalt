#!/usr/bin/env python3
"""
Quick setup verification for YouTube Deepgram Transcriber
Run this to check if your cloud environment is ready.
"""

import os
import sys
import shutil
from dotenv import load_dotenv

load_dotenv()

def check_command(cmd):
    """Check if command exists"""
    return shutil.which(cmd) is not None

def check_env_var(var):
    """Check if environment variable is set"""
    return os.getenv(var) is not None

def main():
    print("="*60)
    print("YouTube Deepgram Transcriber - Setup Verification")
    print("="*60)

    checks = []

    # Critical checks
    print("\n🔍 Critical Requirements:")

    # yt-dlp
    ytdlp_ok = check_command('yt-dlp')
    checks.append(('yt-dlp', ytdlp_ok, 'CRITICAL'))
    status = "✅ INSTALLED" if ytdlp_ok else "❌ MISSING - pip install -U yt-dlp"
    print(f"  yt-dlp: {status}")

    # ffmpeg
    ffmpeg_ok = check_command('ffmpeg')
    checks.append(('ffmpeg', ffmpeg_ok, 'CRITICAL'))
    status = "✅ INSTALLED" if ffmpeg_ok else "❌ MISSING - install ffmpeg for your OS"
    print(f"  ffmpeg: {status}")

    # Deepgram API key
    deepgram_ok = check_env_var('DEEPGRAM_API_KEY')
    checks.append(('DEEPGRAM_API_KEY', deepgram_ok, 'CRITICAL'))
    status = "✅ SET" if deepgram_ok else "❌ MISSING - add to .env file"
    print(f"  DEEPGRAM_API_KEY: {status}")

    # Bot bypass methods
    print("\n🤖 Bot Bypass Configuration (need at least ONE):")

    cookies_file = os.getenv('COOKIES_FILE', 'cookies.txt')
    cookies_ok = os.path.exists(cookies_file)
    checks.append(('Cookies File', cookies_ok, 'OPTIONAL'))
    status = f"✅ FOUND at {cookies_file}" if cookies_ok else f"⚠️  NOT FOUND at {cookies_file}"
    print(f"  Cookies: {status}")

    po_token_ok = check_env_var('YT_PO_TOKEN') and check_env_var('YT_VISITOR_DATA')
    checks.append(('PO Token', po_token_ok, 'OPTIONAL'))
    status = "✅ CONFIGURED" if po_token_ok else "⚠️  NOT SET"
    print(f"  PO Token: {status}")

    proxy_ok = check_env_var('YTDLP_PROXY')
    checks.append(('Proxy', proxy_ok, 'OPTIONAL'))
    status = f"✅ SET" if proxy_ok else "⚠️  NOT SET"
    print(f"  Proxy: {status}")

    # Check if at least one bypass method is configured
    bypass_ok = cookies_ok or po_token_ok or proxy_ok

    # Python packages
    print("\n📦 Python Packages:")
    try:
        import deepgram
        deepgram_ok = True
        print(f"  deepgram-sdk: ✅ INSTALLED (v{deepgram.__version__})")
    except ImportError:
        deepgram_ok = False
        print(f"  deepgram-sdk: ❌ MISSING - pip install deepgram-sdk")
        checks.append(('deepgram-sdk', False, 'CRITICAL'))

    try:
        from dotenv import load_dotenv
        print(f"  python-dotenv: ✅ INSTALLED")
    except ImportError:
        print(f"  python-dotenv: ❌ MISSING - pip install python-dotenv")
        checks.append(('python-dotenv', False, 'CRITICAL'))

    # Summary
    print("\n" + "="*60)
    print("Summary:")
    print("="*60)

    critical_issues = [c[0] for c in checks if c[2] == 'CRITICAL' and not c[1]]

    if critical_issues:
        print("\n❌ SETUP INCOMPLETE - Fix these critical issues:")
        for issue in critical_issues:
            print(f"  • {issue}")
        print("\nRun: pip install -U yt-dlp deepgram-sdk python-dotenv")
        print("See api/DEPLOYMENT.md for full setup instructions")
        sys.exit(1)

    if not bypass_ok:
        print("\n⚠️  WARNING: No bot bypass method configured!")
        print("   You MUST configure at least one:")
        print("   • Export cookies.txt from browser (RECOMMENDED)")
        print("   • Set YT_PO_TOKEN + YT_VISITOR_DATA")
        print("   • Set YTDLP_PROXY")
        print("\nSee api/DEPLOYMENT.md for instructions")
        sys.exit(1)

    print("\n✅ ALL CHECKS PASSED!")
    print("\nYour environment is ready. Test with:")
    print('  python youtube_deepgram_transcriber.py "https://www.youtube.com/watch?v=VIDEO_ID"')
    print("\n" + "="*60)

if __name__ == "__main__":
    main()
