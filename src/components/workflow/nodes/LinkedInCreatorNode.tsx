'use client';

import { memo, useState, useCallback, useRef, SyntheticEvent } from 'react';
import { Linkedin, Upload, Mic, Sparkles, Loader2, Copy, Check, RefreshCw, Info, AlertCircle, PenSquare } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { NodeHeader } from './NodeHeader';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { buildChatContext } from '@/lib/workflow/context-builder';
import type { NodeProps } from '@xyflow/react';
import type { LinkedInCreatorNodeData } from '@/types/workflow';
import { StyleConfigDialog } from './StyleConfigDialog';
import { LinkedInPostPreview } from './LinkedInPostPreview';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Stop event propagation for ReactFlow
const stopPropagation = (e: SyntheticEvent) => {
  e.stopPropagation();
};

type NativeEventWithStop = Event & { stopImmediatePropagation?: () => void };

export const LinkedInCreatorNode = memo(({ id, data, parentId }: NodeProps<LinkedInCreatorNodeData>) => {
  const [styleDialogOpen, setStyleDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const workflow = useWorkflowStore((state) => state.workflow);
  const getNode = useWorkflowStore((state) => state.getNode);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopReactFlowPropagation = useCallback((event: SyntheticEvent) => {
    event.stopPropagation();
    (event.nativeEvent as NativeEventWithStop).stopImmediatePropagation?.();
  }, []);

  // Handle tab change
  const handleTabChange = useCallback((tab: 'your-topic' | 'suggested-topic') => {
    updateNodeData(id, { selectedTab: tab } as Partial<LinkedInCreatorNodeData>);

    // Load suggestions when switching to suggested topic tab
    if (tab === 'suggested-topic' && (!data.suggestedTopics || data.suggestedTopics.length === 0)) {
      loadSuggestedTopics();
    }
  }, [id, data.suggestedTopics]);

  // Load suggested topics from connected nodes + AI
  const loadSuggestedTopics = useCallback(async () => {
    if (!workflow) return;

    setIsLoadingSuggestions(true);
    try {
      const context = buildChatContext(id, workflow);

      const response = await fetch('/api/linkedin/suggest-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ context }),
      });

      const result = await response.json();

      if (response.ok) {
        updateNodeData(id, {
          suggestedTopics: result.topics || [],
        } as Partial<LinkedInCreatorNodeData>);
      }
    } catch (error) {
      console.error('Failed to load topic suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [id, workflow]);

  // Handle topic input change
  const handleTopicChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, {
      manualTopic: e.target.value,
    } as Partial<LinkedInCreatorNodeData>);
  }, [id]);

  // Handle voice tone change
  const handleVoiceToneChange = useCallback((tone: string) => {
    updateNodeData(id, {
      voiceTone: tone as LinkedInCreatorNodeData['voiceTone'],
    } as Partial<LinkedInCreatorNodeData>);
  }, [id]);

  // Handle style settings save
  const handleStyleSave = useCallback((settings: LinkedInCreatorNodeData['styleSettings']) => {
    updateNodeData(id, {
      styleSettings: settings,
    } as Partial<LinkedInCreatorNodeData>);
  }, [id]);

  // Handle file removal
  const handleRemoveFile = useCallback((fileId: string) => {
    const currentNode = getNode(id);
    const currentData = currentNode?.data as LinkedInCreatorNodeData;
    const currentFiles = currentData?.uploadedFiles || [];

    updateNodeData(id, {
      uploadedFiles: currentFiles.filter(f => f.id !== fileId),
    } as Partial<LinkedInCreatorNodeData>);
  }, [id, getNode, updateNodeData]);

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileType = file.type.startsWith('image/') ? 'image'
      : file.type.startsWith('audio/') ? 'audio'
      : 'document';

    // Create a temporary file entry
    const fileId = crypto.randomUUID();
    const newFile = {
      id: fileId,
      type: fileType,
      url: URL.createObjectURL(file),
      fileName: file.name,
      extractionStatus: 'extracting' as const,
    };

    // Get fresh state before adding new file
    const currentNode = getNode(id);
    const currentData = currentNode?.data as LinkedInCreatorNodeData;
    const currentFiles = currentData?.uploadedFiles || [];

    updateNodeData(id, {
      uploadedFiles: [...currentFiles, newFile],
    } as Partial<LinkedInCreatorNodeData>);

    // Process the file based on type
    try {
      let extractedTopic = '';

      if (fileType === 'image') {
        // Use existing image analysis API
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/image/analyze', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        extractedTopic = result.description || result.ocrText || '';
      } else if (fileType === 'audio') {
        // Use existing voice transcription API
        const formData = new FormData();
        formData.append('audio', file);

        const response = await fetch('/api/voice/transcribe', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        extractedTopic = result.transcript || '';
      } else if (fileType === 'document') {
        // Use existing PDF parsing API
        const formData = new FormData();
        formData.append('pdf', file);

        const response = await fetch('/api/pdf/parse', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        extractedTopic = result.parsedText || '';
      }

      console.log('[LinkedIn Creator] Extracted topic:', extractedTopic?.substring(0, 100));

      // Get fresh state from store to avoid stale data
      const currentNode = getNode(id);
      const currentData = currentNode?.data as LinkedInCreatorNodeData;
      const currentFiles = currentData?.uploadedFiles || [];

      // Update the file entry with extracted topic
      updateNodeData(id, {
        uploadedFiles: currentFiles.map(f =>
          f.id === fileId
            ? { ...f, extractedTopic, extractionStatus: 'success' as const }
            : f
        ),
      } as Partial<LinkedInCreatorNodeData>);
    } catch (error) {
      console.error('[LinkedIn Creator] File processing error:', error);

      // Get fresh state from store
      const currentNode = getNode(id);
      const currentData = currentNode?.data as LinkedInCreatorNodeData;
      const currentFiles = currentData?.uploadedFiles || [];

      updateNodeData(id, {
        uploadedFiles: currentFiles.map(f =>
          f.id === fileId
            ? { ...f, extractionStatus: 'error' as const, extractionError: 'Failed to process file' }
            : f
        ),
      } as Partial<LinkedInCreatorNodeData>);
    }
  }, [id, getNode, updateNodeData]);

  // Handle post generation
  const handleGenerate = useCallback(async () => {
    if (!workflow) return;

    const topic = data.selectedTab === 'your-topic'
      ? data.manualTopic
      : data.selectedSuggestedTopic;

    if (!topic || topic.trim().length < 5) {
      updateNodeData(id, {
        generationError: 'Please enter a topic with at least 5 words',
      } as Partial<LinkedInCreatorNodeData>);
      return;
    }

    updateNodeData(id, {
      generationStatus: 'generating',
      generationError: undefined,
    } as Partial<LinkedInCreatorNodeData>);

    try {
      const context = buildChatContext(id, workflow);

      const response = await fetch('/api/linkedin/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          topic,
          voiceTone: data.voiceTone,
          styleSettings: data.styleSettings,
          uploadedFiles: data.uploadedFiles,
          context,
          aiInstructions: data.aiInstructions,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Generation failed');
      }

      updateNodeData(id, {
        generatedPost: result.content,
        generatedPostPlainText: result.plainText,
        characterCount: result.characterCount,
        generationStatus: 'success',
        generatedAt: new Date().toISOString(),
        generationWarning: result.warning,
      } as Partial<LinkedInCreatorNodeData>);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed';
      updateNodeData(id, {
        generationStatus: 'error',
        generationError: message,
      } as Partial<LinkedInCreatorNodeData>);
    }
  }, [id, data, workflow]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!data.generatedPostPlainText) return;

    try {
      await navigator.clipboard.writeText(data.generatedPostPlainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [data.generatedPostPlainText]);

  // Handle suggested topic selection
  const handleSelectSuggestedTopic = useCallback((topic: string) => {
    updateNodeData(id, {
      selectedSuggestedTopic: topic,
    } as Partial<LinkedInCreatorNodeData>);
  }, [id]);

  const voiceToneOptions = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'inspirational', label: 'Inspirational' },
    { value: 'thought-leadership', label: 'Thought Leadership' },
    { value: 'humorous', label: 'Humorous' },
    { value: 'educational', label: 'Educational' },
    { value: 'storytelling', label: 'Storytelling' },
  ];

  return (
    <>
      <BaseNode
        id={id}
        parentId={parentId}
        showTargetHandle={true}
        showSourceHandle={true}
        header={
          <NodeHeader
            title="LinkedIn Post Creator"
            subtitle={data.generationStatus === 'success' ? `${data.characterCount || 0} characters` : 'AI-powered post generator'}
            icon={<Linkedin />}
            themeKey="linkedin"
          />
        }
      >
        <div className="flex gap-3 w-[850px]">
          {/* Left Panel - Input */}
          <div className="flex-1 space-y-3 p-4 bg-white rounded-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                What would you like to post?
              </h3>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={(e) => { stopReactFlowPropagation(e); handleTabChange('your-topic'); }}
                onMouseDown={stopPropagation}
                className={cn(
                  'flex-1 px-4 py-2 text-xs font-medium border-b-2 transition-colors',
                  data.selectedTab === 'your-topic'
                    ? 'border-[#0A66C2] text-[#0A66C2]'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                )}
              >
                Your Topic
              </button>
              <button
                onClick={(e) => { stopReactFlowPropagation(e); handleTabChange('suggested-topic'); }}
                onMouseDown={stopPropagation}
                className={cn(
                  'flex-1 px-4 py-2 text-xs font-medium border-b-2 transition-colors',
                  data.selectedTab === 'suggested-topic'
                    ? 'border-[#0A66C2] text-[#0A66C2]'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                )}
              >
                Suggested Topic
              </button>
            </div>

            {/* Tab Content */}
            {data.selectedTab === 'your-topic' ? (
              <div className="space-y-3">
                {/* File Upload */}
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Topic from image, audio, or document files
                    </label>
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={stopReactFlowPropagation}
                            onMouseDown={stopPropagation}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[280px]">
                          <p className="text-xs">
                            Upload files to extract content as topic ideas. AI analyzes images, transcribes audio, and parses documents automatically.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div
                    onClick={(e) => { stopReactFlowPropagation(e); fileInputRef.current?.click(); }}
                    onMouseDown={stopPropagation}
                    className="border-2 border-dashed border-gray-200 rounded-lg p-6 hover:border-gray-300 cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Upload className="h-5 w-5 text-gray-400" />
                      <p className="text-xs text-gray-600">
                        Click or drag and drop to upload image, audio, or document
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,audio/*,.pdf,.doc,.docx"
                      onChange={(e) => handleFileUpload(e.target.files)}
                      className="hidden"
                    />
                  </div>

                  {/* Uploaded Files */}
                  {data.uploadedFiles && data.uploadedFiles.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {data.uploadedFiles.map((file) => (
                        <div key={file.id} className="border border-gray-200 rounded-lg bg-gray-50/50 overflow-hidden">
                          {/* File Header */}
                          <div className="flex items-center gap-2 p-2 bg-white border-b border-gray-200">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-900 truncate">
                                  {file.fileName}
                                </span>
                                {file.extractionStatus === 'extracting' && (
                                  <span className="flex items-center gap-1 text-[10px] text-blue-600">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Extracting...
                                  </span>
                                )}
                                {file.extractionStatus === 'success' && (
                                  <span className="flex items-center gap-1 text-[10px] text-green-600">
                                    <Check className="h-3 w-3" />
                                    Extracted
                                  </span>
                                )}
                                {file.extractionStatus === 'error' && (
                                  <span className="flex items-center gap-1 text-[10px] text-red-600">
                                    <AlertCircle className="h-3 w-3" />
                                    Failed
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-500 mt-0.5 capitalize">
                                {file.type}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                stopReactFlowPropagation(e);
                                handleRemoveFile(file.id);
                              }}
                              onMouseDown={stopPropagation}
                              className="text-gray-400 hover:text-red-600 p-1"
                              title="Remove file"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          {/* Extracted Content */}
                          {file.extractionStatus === 'success' && file.extractedTopic && (
                            <div className="p-3">
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-[10px] font-medium text-gray-500 uppercase">
                                  Extracted Content
                                </div>
                                <button
                                  onClick={(e) => {
                                    stopReactFlowPropagation(e);
                                    updateNodeData(id, {
                                      manualTopic: file.extractedTopic,
                                    } as Partial<LinkedInCreatorNodeData>);
                                  }}
                                  onMouseDown={stopPropagation}
                                  className="text-[10px] text-[#0A66C2] hover:text-[#004182] font-medium"
                                >
                                  Use as Topic
                                </button>
                              </div>
                              <div className="text-xs text-gray-700 leading-relaxed max-h-32 overflow-y-auto bg-white rounded p-2 border border-gray-100">
                                {file.extractedTopic.length > 300
                                  ? `${file.extractedTopic.substring(0, 300)}...`
                                  : file.extractedTopic}
                              </div>
                              {file.extractedTopic.length > 300 && (
                                <div className="text-[10px] text-gray-500 mt-1">
                                  Showing first 300 characters • Full content will be used
                                </div>
                              )}
                            </div>
                          )}

                          {/* Error Message */}
                          {file.extractionStatus === 'error' && file.extractionError && (
                            <div className="p-2 text-[10px] text-red-600">
                              {file.extractionError}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Post Topic */}
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Post Topic
                    </label>
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={stopReactFlowPropagation}
                            onMouseDown={stopPropagation}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[280px]">
                          <p className="text-xs">
                            Be specific and clear. Best posts focus on a single idea with personal perspective. Use 1,000-1,500 characters for optimal engagement.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="relative">
                    <Textarea
                      value={data.manualTopic || ''}
                      onChange={handleTopicChange}
                      onClick={stopReactFlowPropagation}
                      onMouseDown={stopPropagation}
                      placeholder="Enter a topic using 5 words or more..."
                      className="text-xs resize-none pr-8"
                      rows={4}
                    />
                    <button
                      onClick={stopReactFlowPropagation}
                      onMouseDown={stopPropagation}
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                      title="Voice input"
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {isLoadingSuggestions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    <span className="ml-2 text-xs text-gray-600">Loading suggestions...</span>
                  </div>
                ) : data.suggestedTopics && data.suggestedTopics.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {data.suggestedTopics.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={(e) => { stopReactFlowPropagation(e); handleSelectSuggestedTopic(suggestion.topic); }}
                        onMouseDown={stopPropagation}
                        className={cn(
                          'text-left p-3 rounded-lg border transition-colors',
                          data.selectedSuggestedTopic === suggestion.topic
                            ? 'border-[#0A66C2] bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        )}
                      >
                        <p className="text-xs font-medium text-gray-900">{suggestion.topic}</p>
                        <p className="text-[10px] text-gray-500 mt-1">From: {suggestion.source}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-gray-500">
                    No suggestions available. Connect nodes to this node for smart suggestions.
                  </div>
                )}
              </div>
            )}

            {/* Voice Tone */}
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <label className="text-xs font-medium text-gray-700">
                  Voice Tone
                </label>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={stopReactFlowPropagation}
                        onMouseDown={stopPropagation}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Info className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[280px]">
                      <p className="text-xs">
                        64% of decision-makers prefer human, conversational tone. Choose professional for credibility, casual for relatability, or storytelling for emotional connection.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={data.voiceTone || 'professional'}
                onValueChange={handleVoiceToneChange}
              >
                <SelectTrigger
                  onClick={stopReactFlowPropagation}
                  onMouseDown={stopPropagation}
                  className="text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {voiceToneOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-2 pt-2">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={(e) => { stopReactFlowPropagation(e); setStyleDialogOpen(true); }}
                      onMouseDown={stopPropagation}
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                    >
                      <PenSquare className="h-3 w-3" />
                      Style
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px]">
                    <p className="text-xs">
                      Customize format, length, emojis, hashtags, and CTA. Posts with formatting see 40% higher engagement.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={(e) => { stopReactFlowPropagation(e); handleGenerate(); }}
                      onMouseDown={stopPropagation}
                      disabled={data.generationStatus === 'generating'}
                      className="flex-1 bg-[#E74694] hover:bg-[#D63A84] text-white text-xs gap-1.5"
                      size="sm"
                    >
                      {data.generationStatus === 'generating' ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" />
                          Generate Post
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px]">
                    <p className="text-xs">
                      Uses AI to create an engaging LinkedIn post following Story → Lesson → Steps → Reminder structure.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Error Message */}
            {data.generationError && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                {data.generationError}
              </div>
            )}
          </div>

          {/* Right Panel - Output */}
          <div className="flex-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
            {data.generatedPost ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-semibold text-gray-700">Preview</h3>
                  <div className="flex items-center gap-1.5">
                    <Button
                      onClick={(e) => { stopReactFlowPropagation(e); handleCopy(); }}
                      onMouseDown={stopPropagation}
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1 h-7 px-2"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button
                      onClick={(e) => { stopReactFlowPropagation(e); handleGenerate(); }}
                      onMouseDown={stopPropagation}
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1 h-7 px-2"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Retry
                    </Button>
                  </div>
                </div>

                {data.generationWarning && (
                  <div className="text-xs text-orange-600 bg-orange-50 border border-orange-200 p-2 rounded flex items-start gap-1.5">
                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{data.generationWarning}</span>
                  </div>
                )}

                <LinkedInPostPreview
                  content={data.generatedPostPlainText || data.generatedPost}
                  characterCount={data.characterCount || 0}
                  generatedAt={data.generatedAt}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[350px] text-center">
                <div className="space-y-2">
                  <div className="text-gray-300">
                    <Sparkles className="h-10 w-10 mx-auto mb-2" />
                  </div>
                  <p className="text-xs text-gray-500 font-medium">
                    Generate a post to see preview
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </BaseNode>

      {/* Style Configuration Dialog */}
      <StyleConfigDialog
        isOpen={styleDialogOpen}
        onClose={() => setStyleDialogOpen(false)}
        currentSettings={data.styleSettings}
        onSave={handleStyleSave}
      />
    </>
  );
});

LinkedInCreatorNode.displayName = 'LinkedInCreatorNode';
