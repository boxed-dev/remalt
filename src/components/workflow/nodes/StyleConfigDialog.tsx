'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Info } from 'lucide-react';
import type { LinkedInCreatorNodeData } from '@/types/workflow';

interface StyleConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: LinkedInCreatorNodeData['styleSettings'];
  onSave: (settings: LinkedInCreatorNodeData['styleSettings']) => void;
}

export function StyleConfigDialog({
  isOpen,
  onClose,
  currentSettings,
  onSave,
}: StyleConfigDialogProps) {
  const [settings, setSettings] = useState(currentSettings || {
    format: 'storytelling',
    length: 'medium',
    targetLength: 900,
    useEmojis: false,
    hashtagCount: 3,
    lineBreakStyle: 'moderate',
    includeCTA: true,
    ctaType: 'comment',
    customCTA: '',
  });

  // Sync with parent when dialog opens
  useEffect(() => {
    if (isOpen && currentSettings) {
      setSettings(currentSettings);
    }
  }, [isOpen, currentSettings]);

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  // Length presets
  const lengthPresets = {
    short: { min: 300, max: 600, default: 450 },
    medium: { min: 600, max: 1200, default: 900 },
    long: { min: 1200, max: 3000, default: 1800 },
  };

  const handleLengthChange = (length: 'short' | 'medium' | 'long') => {
    setSettings({
      ...settings,
      length,
      targetLength: lengthPresets[length].default,
    });
  };

  const handleTargetLengthChange = (value: number[]) => {
    const targetLength = value[0];
    // Determine which length category this falls into
    let length: 'short' | 'medium' | 'long' = 'medium';
    if (targetLength < 600) length = 'short';
    else if (targetLength < 1200) length = 'medium';
    else length = 'long';

    setSettings({
      ...settings,
      length,
      targetLength,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post Style Configuration</DialogTitle>
          <DialogDescription>
            Customize the format, length, and style of your LinkedIn post
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Post Format */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="format" className="text-sm font-medium">
                Post Format
              </Label>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[260px]">
                    <p className="text-xs">
                      Storytelling hooks readers emotionally. Listicles are skimmable. How-To guides drive saves.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={settings.format}
              onValueChange={(value) =>
                setSettings({
                  ...settings,
                  format: value as typeof settings.format,
                })
              }
            >
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="storytelling">Storytelling</SelectItem>
                <SelectItem value="listicle">Listicle (Numbered Points)</SelectItem>
                <SelectItem value="question-based">Question-Based</SelectItem>
                <SelectItem value="personal-story">Personal Story</SelectItem>
                <SelectItem value="case-study">Case Study</SelectItem>
                <SelectItem value="how-to">How-To Guide</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Post Length */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Post Length</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['short', 'medium', 'long'] as const).map((len) => (
                <button
                  key={len}
                  onClick={() => handleLengthChange(len)}
                  className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
                    settings.length === len
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {len.charAt(0).toUpperCase() + len.slice(1)}
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {lengthPresets[len].min}-{lengthPresets[len].max}
                  </div>
                </button>
              ))}
            </div>

            {/* Character Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Target Characters</span>
                <span className="font-medium">{settings.targetLength}</span>
              </div>
              <Slider
                value={[settings.targetLength || 900]}
                onValueChange={handleTargetLengthChange}
                min={300}
                max={3000}
                step={50}
                className="w-full"
              />
            </div>
          </div>

          {/* Emojis */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <Label htmlFor="emojis" className="text-sm font-medium">
                  Use Emojis
                </Label>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-gray-400 hover:text-gray-600">
                        <Info className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[260px]">
                      <p className="text-xs">
                        Posts with 1-3 emojis get 25% more interactions. Use sparingly for professional tone.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-gray-500">
                Add emojis to make the post more engaging
              </p>
            </div>
            <Switch
              id="emojis"
              checked={settings.useEmojis}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, useEmojis: checked })
              }
            />
          </div>

          {/* Hashtag Count */}
          <div className="space-y-2">
            <Label htmlFor="hashtags" className="text-sm font-medium">
              Number of Hashtags
            </Label>
            <Select
              value={String(settings.hashtagCount || 3)}
              onValueChange={(value) =>
                setSettings({ ...settings, hashtagCount: parseInt(value) })
              }
            >
              <SelectTrigger id="hashtags">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No Hashtags</SelectItem>
                <SelectItem value="1">1 Hashtag</SelectItem>
                <SelectItem value="2">2 Hashtags</SelectItem>
                <SelectItem value="3">3 Hashtags</SelectItem>
                <SelectItem value="4">4 Hashtags</SelectItem>
                <SelectItem value="5">5 Hashtags</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Line Break Style */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="linebreaks" className="text-sm font-medium">
                Line Break Style
              </Label>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[260px]">
                    <p className="text-xs">
                      Generous spacing increases readability by 40%. Use generous for storytelling, moderate for balance.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={settings.lineBreakStyle}
              onValueChange={(value) =>
                setSettings({
                  ...settings,
                  lineBreakStyle: value as typeof settings.lineBreakStyle,
                })
              }
            >
              <SelectTrigger id="linebreaks">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Minimal (Dense)</SelectItem>
                <SelectItem value="moderate">Moderate (Balanced)</SelectItem>
                <SelectItem value="generous">Generous (Spacious)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Call-to-Action */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Label htmlFor="cta" className="text-sm font-medium">
                  Include Call-to-Action
                </Label>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-gray-400 hover:text-gray-600">
                        <Info className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[260px]">
                      <p className="text-xs">
                        Posts with CTAs drive 3x more engagement. Ask questions for comments, encourage shares for reach.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="cta"
                checked={settings.includeCTA}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, includeCTA: checked })
                }
              />
            </div>

            {settings.includeCTA && (
              <>
                <Select
                  value={settings.ctaType}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      ctaType: value as typeof settings.ctaType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comment">Ask for Comments</SelectItem>
                    <SelectItem value="share">Encourage Shares</SelectItem>
                    <SelectItem value="link">Include Link</SelectItem>
                    <SelectItem value="dm">Request DM</SelectItem>
                    <SelectItem value="custom">Custom CTA</SelectItem>
                  </SelectContent>
                </Select>

                {settings.ctaType === 'custom' && (
                  <Textarea
                    placeholder="Enter your custom call-to-action..."
                    value={settings.customCTA || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, customCTA: e.target.value })
                    }
                    className="text-xs resize-none"
                    rows={2}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} size="sm">
            Cancel
          </Button>
          <Button onClick={handleSave} size="sm">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
