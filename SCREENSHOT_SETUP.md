# Webpage Screenshot Configuration

This document explains how to configure enterprise-grade webpage screenshot generation for the Webpage node preview feature.

## Overview

The system uses a **multi-provider fallback architecture** to ensure 100% uptime for webpage previews. It automatically tries multiple screenshot APIs in priority order until one succeeds.

### Default Behavior (No Configuration Required)

**Microlink** is the fallback provider that works without any API key. It has rate limits but ensures the feature always works.

### Production Setup (Recommended)

For production use, configure at least one paid/freemium API key to get:
- ✅ Higher quality screenshots
- ✅ Better rate limits
- ✅ Faster response times
- ✅ More reliability

## Provider Comparison

| Provider | Free Tier | Paid Plan | Quality | Speed | Reliability |
|----------|-----------|-----------|---------|-------|-------------|
| **ScreenshotOne** | 100/mo | $19/mo (10k) | ⭐⭐⭐⭐⭐ | Fast | Excellent |
| **ApiFlash** | 100/mo | $6/mo (1k) | ⭐⭐⭐⭐⭐ | Fast | Excellent |
| **ScreenshotAPI** | 100/mo | $29/mo (10k) | ⭐⭐⭐⭐ | Medium | Good |
| **Urlbox** | 1k/mo | $9/mo (5k) | ⭐⭐⭐⭐ | Very Fast | Excellent |
| **Microlink** | Rate limited | Free | ⭐⭐⭐ | Slow | Good |

## Setup Instructions

### Option 1: ScreenshotOne (Recommended for Quality)

1. Sign up at https://screenshotone.com
2. Get your API key from the dashboard
3. Add to `.env`:
```bash
SCREENSHOTONE_API_KEY=your_key_here
```

**Best for:** High-quality screenshots, enterprise use

### Option 2: ApiFlash (Recommended for Budget)

1. Sign up at https://apiflash.com
2. Get your access key from the dashboard
3. Add to `.env`:
```bash
APIFLASH_API_KEY=your_key_here
```

**Best for:** Cost-effective, good quality

### Option 3: ScreenshotAPI

1. Sign up at https://screenshotapi.net
2. Get your token from the dashboard
3. Add to `.env`:
```bash
SCREENSHOTAPI_API_KEY=your_token_here
```

**Best for:** Higher free tier limits

### Option 4: Urlbox (Recommended for Free Tier)

1. Sign up at https://urlbox.io
2. Get your API key and secret
3. Add to `.env`:
```bash
URLBOX_API_KEY=your_key_here
URLBOX_SECRET=your_secret_here
```

**Best for:** Generous free tier (1k/month)

### Option 5: Microlink (No Setup - Fallback)

Works automatically without configuration. Has rate limits but provides basic functionality.

**Best for:** Development, testing, or when no other API is configured

## How It Works

### Priority Chain

The system tries providers in this order:

1. **ScreenshotOne** (if configured) - Best quality
2. **ApiFlash** (if configured) - Excellent reliability
3. **Urlbox** (if configured) - Fast performance
4. **ScreenshotAPI** (if configured) - Good quality
5. **Microlink** (always available) - Free fallback

### Automatic Fallback

If a provider fails (timeout, rate limit, error), the system automatically tries the next one. This ensures **zero downtime** even if:
- A provider is temporarily down
- You hit rate limits
- API keys expire
- Network issues occur

### Smart Features

- ✅ **15-second timeout** per provider (prevents hanging)
- ✅ **Detailed logging** for debugging
- ✅ **Automatic retries** across providers
- ✅ **Base64 image support** (no external dependencies)
- ✅ **Cache-friendly** (30-day TTL when supported)
- ✅ **Ad/cookie banner blocking** (ScreenshotOne)
- ✅ **Retina display support** (2x pixel density)

## Configuration Examples

### Development Setup (Free)
```bash
# Use Microlink only (no configuration needed)
# Or use Urlbox free tier:
URLBOX_API_KEY=your_free_key
URLBOX_SECRET=your_secret
```

### Production Setup (Recommended)
```bash
# Primary: ScreenshotOne for quality
SCREENSHOTONE_API_KEY=your_screenshotone_key

# Backup: ApiFlash for reliability
APIFLASH_API_KEY=your_apiflash_key

# Microlink is automatic fallback
```

### Enterprise Setup (Maximum Reliability)
```bash
# All providers configured for 100% uptime
SCREENSHOTONE_API_KEY=your_screenshotone_key
APIFLASH_API_KEY=your_apiflash_key
SCREENSHOTAPI_API_KEY=your_screenshotapi_key
URLBOX_API_KEY=your_urlbox_key
URLBOX_SECRET=your_urlbox_secret
```

## Testing

After configuration, test by:

1. Create a Webpage node in the workflow
2. Enter any URL (e.g., `https://github.com`)
3. Check the browser console for logs:
   ```
   [Screenshot] Generating screenshot for: https://github.com
   [Screenshot] Trying provider: ScreenshotOne
   [Screenshot] Provider ScreenshotOne succeeded (245.3KB)
   ```

## Troubleshooting

### No screenshots appearing
1. Check browser console for errors
2. Verify at least Microlink is working (requires no config)
3. Check if API keys are correctly set in `.env`

### Rate limit errors
1. Add more API providers to increase total quota
2. Upgrade to paid plans for higher limits
3. Microlink fallback will still work

### Quality issues
1. Use ScreenshotOne or ApiFlash for best quality
2. Check provider settings (viewport, pixel density)
3. Some websites block screenshot services

### Slow performance
1. Use Urlbox for fastest screenshots
2. Configure multiple providers for parallel fallback
3. Check network connectivity

## Cost Optimization

### Strategy 1: Free Tier Stacking
```bash
# Combine free tiers for ~1,400 screenshots/month
SCREENSHOTONE_API_KEY=free_100
APIFLASH_API_KEY=free_100
SCREENSHOTAPI_API_KEY=free_100
URLBOX_API_KEY=free_1000
# + Microlink unlimited (rate limited)
```

### Strategy 2: Primary + Fallback
```bash
# One paid primary, free fallbacks
APIFLASH_API_KEY=paid_plan  # $6/mo for 1k
URLBOX_API_KEY=free_1k
# + Microlink
```

### Strategy 3: Enterprise
```bash
# Mix of paid for guaranteed capacity
SCREENSHOTONE_API_KEY=paid_10k  # $19/mo
APIFLASH_API_KEY=paid_5k         # $14/mo
# Total: 15k/mo for $33
```

## Security Notes

- ✅ All API keys are server-side only (`.env` file)
- ✅ Never exposed to browser/client
- ✅ Images served as base64 or via CDN
- ✅ No external dependencies in frontend
- ✅ HTTPS enforced for all API calls

## API Documentation

- **ScreenshotOne**: https://screenshotone.com/docs
- **ApiFlash**: https://apiflash.com/docs
- **ScreenshotAPI**: https://screenshotapi.net/documentation
- **Urlbox**: https://urlbox.io/docs
- **Microlink**: https://microlink.io/docs/api/getting-started/overview

## Support

For issues with:
- **The feature**: Check application logs
- **Specific providers**: Contact provider support
- **Configuration**: Review this document

Remember: The system is designed to **never fail completely** thanks to Microlink fallback. Additional providers just improve quality and reliability.
