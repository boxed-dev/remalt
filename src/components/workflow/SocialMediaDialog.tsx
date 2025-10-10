'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Instagram, Linkedin, Youtube, Globe } from 'lucide-react'

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
    icon: Instagram,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 hover:bg-pink-100',
    placeholder: 'https://www.instagram.com/p/...',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    placeholder: 'https://www.linkedin.com/posts/...',
  },
  youtube: {
    name: 'YouTube',
    icon: Youtube,
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

  const handlePlatformSelect = (platform: 'instagram' | 'linkedin' | 'youtube' | 'webpage') => {
    setDetectedPlatform(platform)
    setUrl('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Social Media</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Platform selection buttons */}
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(platformConfig) as Array<keyof typeof platformConfig>).map((platform) => {
              const config = platformConfig[platform]
              const Icon = config.icon
              return (
                <button
                  key={platform}
                  onClick={() => handlePlatformSelect(platform)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    detectedPlatform === platform
                      ? `${config.bgColor} border-current ${config.color}`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`h-6 w-6 ${detectedPlatform === platform ? config.color : 'text-gray-400'}`} />
                  <span className="text-xs mt-1 font-medium">{config.name}</span>
                </button>
              )
            })}
          </div>

          {/* URL input */}
          <div className="space-y-2">
            <Input
              placeholder={detectedPlatform ? platformConfig[detectedPlatform].placeholder : 'Paste a URL...'}
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="w-full"
              autoFocus
            />
            {detectedPlatform && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                {(() => {
                  const Icon = platformConfig[detectedPlatform].icon
                  return <Icon className={`h-4 w-4 ${platformConfig[detectedPlatform].color}`} />
                })()}
                Detected: {platformConfig[detectedPlatform].name}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUrl('')
                setDetectedPlatform(null)
                onOpenChange(false)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddNode}
              disabled={!detectedPlatform || !url}
            >
              Add Node
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
