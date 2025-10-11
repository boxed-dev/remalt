'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { InstagramLogo, LinkedinLogo, YoutubeLogo, Globe } from '@phosphor-icons/react'

interface SocialMediaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddNode: (type: 'instagram' | 'linkedin' | 'youtube' | 'webpage', url: string) => void
}

// Platform detection from URL patterns
const detectPlatform = (url: string): 'instagram' | 'linkedin' | 'youtube' | 'webpage' | null => {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    if (hostname.includes('instagram.com') || hostname.includes('instagr.am')) {
      return 'instagram'
    }
    if (hostname.includes('linkedin.com')) {
      return 'linkedin'
    }
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return 'youtube'
    }
    // Default to webpage for any other URL
    return 'webpage'
  } catch {
    return null
  }
}

const platformConfig = {
  instagram: {
    name: 'Instagram',
    icon: InstagramLogo,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 hover:bg-pink-100',
    placeholder: 'https://www.instagram.com/p/...',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: LinkedinLogo,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    placeholder: 'https://www.linkedin.com/posts/...',
  },
  youtube: {
    name: 'YouTube',
    icon: YoutubeLogo,
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100',
    placeholder: 'https://www.youtube.com/watch?v=...',
  },
  webpage: {
    name: 'Webpage',
    icon: Globe,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 hover:bg-gray-100',
    placeholder: 'https://example.com',
  },
}

export function SocialMediaDialog({ open, onOpenChange, onAddNode }: SocialMediaDialogProps) {
  const [url, setUrl] = useState('')
  const [detectedPlatform, setDetectedPlatform] = useState<'instagram' | 'linkedin' | 'youtube' | 'webpage' | null>(null)

  const handleUrlChange = (value: string) => {
    setUrl(value)
    const platform = detectPlatform(value)
    setDetectedPlatform(platform)
  }

  const handleAddNode = () => {
    if (detectedPlatform && url) {
      onAddNode(detectedPlatform, url)
      setUrl('')
      setDetectedPlatform(null)
      onOpenChange(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddNode()
    }
  }

  const handlePlatformSelect = (platform: 'instagram' | 'linkedin' | 'youtube' | 'webpage') => {
    setDetectedPlatform(platform)
    setUrl('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Add Content</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Platform icons - single row, larger and more spaced */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => handlePlatformSelect('youtube')}
              className={`p-3 rounded-xl transition-all ${
                detectedPlatform === 'youtube'
                  ? 'bg-red-50 text-red-600 ring-2 ring-red-200'
                  : 'text-gray-400 hover:text-red-500 hover:bg-gray-50'
              }`}
              title="YouTube"
            >
              <YoutubeLogo size={32} weight="fill" />
            </button>
            <button
              onClick={() => handlePlatformSelect('instagram')}
              className={`p-3 rounded-xl transition-all ${
                detectedPlatform === 'instagram'
                  ? 'bg-pink-50 text-pink-600 ring-2 ring-pink-200'
                  : 'text-gray-400 hover:text-pink-500 hover:bg-gray-50'
              }`}
              title="Instagram"
            >
              <InstagramLogo size={32} weight="fill" />
            </button>
            <button
              onClick={() => handlePlatformSelect('linkedin')}
              className={`p-3 rounded-xl transition-all ${
                detectedPlatform === 'linkedin'
                  ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-200'
                  : 'text-gray-400 hover:text-blue-500 hover:bg-gray-50'
              }`}
              title="LinkedIn"
            >
              <LinkedinLogo size={32} weight="fill" />
            </button>
            <button
              onClick={() => handlePlatformSelect('webpage')}
              className={`p-3 rounded-xl transition-all ${
                detectedPlatform === 'webpage'
                  ? 'bg-gray-100 text-gray-700 ring-2 ring-gray-300'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
              title="Webpage"
            >
              <Globe size={32} weight="fill" />
            </button>
          </div>

          {/* URL input - cleaner design */}
          <div className="space-y-3">
            <Input
              placeholder="Paste link here..."
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-12 text-base border-gray-200 focus:border-indigo-400 focus:ring-indigo-400"
              autoFocus
            />
            <p className="text-xs text-gray-500 text-center">
              Paste Cmd/Ctrl + V
            </p>
          </div>

          {/* Single action button */}
          <Button
            onClick={handleAddNode}
            disabled={!detectedPlatform || !url}
            className="w-full h-12 text-base bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-400"
          >
            Add to Board
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
