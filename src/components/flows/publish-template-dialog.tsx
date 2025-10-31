'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TEMPLATE_CATEGORIES } from '@/types/templates';
import { X } from 'lucide-react';

interface PublishTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
  workflowName: string;
  currentCategory?: string;
  currentTags?: string[];
  isPublished?: boolean;
  onPublish: (category: string, tags: string[]) => Promise<void>;
  onUnpublish: () => Promise<void>;
}

export function PublishTemplateDialog({
  open,
  onOpenChange,
  workflowId,
  workflowName,
  currentCategory,
  currentTags = [],
  isPublished = false,
  onPublish,
  onUnpublish,
}: PublishTemplateDialogProps) {
  const [category, setCategory] = useState<string>(currentCategory || '');
  const [tags, setTags] = useState<string[]>(currentTags);
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handlePublish = async () => {
    if (!category) {
      alert('Please select a category');
      return;
    }

    setIsLoading(true);
    try {
      await onPublish(category, tags);
      onOpenChange(false);
    } catch (error) {
      console.error('Error publishing template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnpublish = async () => {
    setIsLoading(true);
    try {
      await onUnpublish();
      onOpenChange(false);
    } catch (error) {
      console.error('Error unpublishing template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isPublished ? 'Manage Public Template' : 'Publish as Template'}
          </DialogTitle>
          <DialogDescription>
            {isPublished
              ? 'Update or unpublish this template.'
              : 'Make this workflow available as a public template for all users.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Workflow Name */}
          <div className="space-y-2">
            <Label htmlFor="workflow-name">Workflow Name</Label>
            <Input
              id="workflow-name"
              value={workflowName}
              disabled
              className="bg-muted text-muted-foreground"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(TEMPLATE_CATEGORIES).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Add tags (press Enter)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="pl-2.5 pr-1 py-1 flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 rounded-full hover:bg-secondary-foreground/20 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isPublished ? (
            <>
              <Button
                type="button"
                variant="destructive"
                onClick={handleUnpublish}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? 'Unpublishing...' : 'Unpublish'}
              </Button>
              <Button
                type="button"
                onClick={handlePublish}
                disabled={isLoading || !category}
                className="w-full sm:w-auto bg-[#095D40] hover:bg-[#074830]"
              >
                {isLoading ? 'Updating...' : 'Update'}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handlePublish}
                disabled={isLoading || !category}
                className="w-full sm:w-auto bg-[#095D40] hover:bg-[#074830]"
              >
                {isLoading ? 'Publishing...' : 'Publish Template'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
