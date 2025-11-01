"use client";

import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FileText, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { useCurrentUser } from '@/hooks/use-current-user';
import { uploadFile } from '@/lib/supabase/storage-service';
import type { Position } from '@/types/workflow';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

type MediaType = 'image' | 'pdf';

interface UploadMediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaType: MediaType;
  position?: Position;
  selectedNodeIds?: string[];
}

interface FileWithPreview {
  file: File;
  id: string;
  preview?: string;
  error?: string;
  uploading?: boolean;
  progress?: number;
}

export function UploadMediaDialog({
  open,
  onOpenChange,
  mediaType,
  position,
  selectedNodeIds = [],
}: UploadMediaDialogProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useCurrentUser();
  const addNode = useWorkflowStore((state) => state.addNode);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const acceptedTypes = mediaType === 'image' ? 'image/*' : 'application/pdf';
  const maxFiles = selectedNodeIds.length > 0 ? selectedNodeIds.length : 10;

  const handleFilesSelected = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);
    const validFiles: FileWithPreview[] = [];

    fileArray.forEach((file) => {
      // Validate file type
      const isValidType = mediaType === 'image'
        ? file.type.startsWith('image/')
        : file.type === 'application/pdf';

      if (!isValidType) {
        validFiles.push({
          file,
          id: crypto.randomUUID(),
          error: `Invalid file type. Expected ${mediaType === 'image' ? 'an image' : 'a PDF'}.`,
        });
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        validFiles.push({
          file,
          id: crypto.randomUUID(),
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        });
        return;
      }

      // Create preview for images
      const fileWithPreview: FileWithPreview = {
        file,
        id: crypto.randomUUID(),
      };

      if (mediaType === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileWithPreview.id
                ? { ...f, preview: e.target?.result as string }
                : f
            )
          );
        };
        reader.readAsDataURL(file);
      }

      validFiles.push(fileWithPreview);
    });

    setFiles((prev) => [...prev, ...validFiles].slice(0, maxFiles));
  }, [mediaType, maxFiles]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFilesSelected(e.dataTransfer.files);
  }, [handleFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const uploadFilesToNodes = async () => {
    if (!user?.id) {
      alert('You must be logged in to upload files');
      return;
    }

    const filesToUpload = files.filter((f) => !f.error);
    if (filesToUpload.length === 0) return;

    // Calculate positions for new nodes
    const basePosition = position || { x: 100, y: 100 };
    const spacing = 320; // Horizontal spacing between nodes

    try {
      // Upload files and create/update nodes
      const uploadPromises = filesToUpload.map(async (fileWithPreview, index) => {
        const { file, id: fileId } = fileWithPreview;

        // Mark as uploading with initial 1% progress
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, uploading: true, progress: 1 } : f
          )
        );

        // Small delay to ensure UI updates
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
          // Upload to Supabase Storage
          const folder = mediaType === 'image' ? 'images' : 'pdfs';
          const result = await uploadFile(file, user.id, folder, {
            onProgress: (progress) => {
              // Ensure progress updates are reflected in UI
              const roundedProgress = Math.min(99, Math.round(progress));
              console.log(`[Dialog] Updating progress for ${file.name}: ${roundedProgress}%`);
              setFiles((prev) => {
                const updated = prev.map((f) =>
                  f.id === fileId ? { ...f, progress: roundedProgress } : f
                );
                return updated;
              });
            },
          });

          // Either update existing node or create new node
          if (selectedNodeIds[index]) {
            // Update existing node
            const nodeId = selectedNodeIds[index];
            if (mediaType === 'image') {
              updateNodeData(nodeId, {
                imageUrl: result.publicUrl,
                thumbnail: result.publicUrl,
                storagePath: result.path,
                storageUrl: result.publicUrl,
                uploadSource: 'storage',
                analysisStatus: 'loading',
                analysisError: undefined,
              });
            } else {
              updateNodeData(nodeId, {
                fileName: result.fileName,
                fileSize: result.fileSize,
                storagePath: result.path,
                storageUrl: result.publicUrl,
                uploadSource: 'storage',
                parseStatus: 'parsing',
                parseError: undefined,
                url: undefined,
              });
            }
          } else {
            // Create new node
            const nodePosition = {
              x: basePosition.x + index * spacing,
              y: basePosition.y,
            };

            if (mediaType === 'image') {
              addNode('image', nodePosition, {
                imageUrl: result.publicUrl,
                thumbnail: result.publicUrl,
                storagePath: result.path,
                storageUrl: result.publicUrl,
                uploadSource: 'storage',
                analysisStatus: 'loading',
                analysisError: undefined,
              });
            } else {
              addNode('pdf', nodePosition, {
                fileName: result.fileName,
                fileSize: result.fileSize,
                storagePath: result.path,
                storageUrl: result.publicUrl,
                uploadSource: 'storage',
                parseStatus: 'parsing',
                parseError: undefined,
              });
            }
          }

          // Mark as complete
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, uploading: false, progress: 100 } : f
            )
          );
        } catch (error) {
          console.error('Upload failed:', error);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    uploading: false,
                    error: error instanceof Error ? error.message : 'Upload failed',
                  }
                : f
            )
          );
        }
      });

      await Promise.all(uploadPromises);

      // Close dialog after successful uploads
      const hasErrors = files.some((f) => f.error);
      if (!hasErrors) {
        handleClose();
      }
    } catch (error) {
      console.error('Upload process failed:', error);
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;

    // Validate URL
    try {
      new URL(urlInput.trim());
    } catch {
      alert('Invalid URL format');
      return;
    }

    const basePosition = position || { x: 100, y: 100 };

    if (selectedNodeIds.length > 0) {
      // Update first selected node
      const nodeId = selectedNodeIds[0];
      if (mediaType === 'image') {
        updateNodeData(nodeId, {
          imageUrl: urlInput,
          thumbnail: urlInput,
          storagePath: undefined,
          storageUrl: undefined,
          uploadSource: 'url',
          analysisStatus: 'loading',
          analysisError: undefined,
        });
      } else {
        updateNodeData(nodeId, {
          url: urlInput,
          fileName: urlInput.split('/').pop() || 'Document',
          uploadSource: 'url',
          parseStatus: 'parsing',
          parseError: undefined,
          storagePath: undefined,
          storageUrl: undefined,
        });
      }
    } else {
      // Create new node
      if (mediaType === 'image') {
        addNode('image', basePosition, {
          imageUrl: urlInput,
          thumbnail: urlInput,
          uploadSource: 'url',
          analysisStatus: 'loading',
        });
      } else {
        addNode('pdf', basePosition, {
          url: urlInput,
          fileName: urlInput.split('/').pop() || 'Document',
          uploadSource: 'url',
          parseStatus: 'parsing',
        });
      }
    }

    handleClose();
  };

  const handleClose = () => {
    setFiles([]);
    setUrlInput('');
    setMode('upload');
    onOpenChange(false);
  };

  const isUploading = files.some((f) => f.uploading);
  const hasValidFiles = files.some((f) => !f.error && !f.uploading);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]" showCloseButton={!isUploading}>
        <DialogHeader>
          <DialogTitle>
            Upload {mediaType === 'image' ? 'Images' : 'PDFs'}
          </DialogTitle>
          <DialogDescription>
            {selectedNodeIds.length > 0
              ? `Upload ${selectedNodeIds.length} ${mediaType === 'image' ? 'image' : 'PDF'} file${selectedNodeIds.length > 1 ? 's' : ''} for the selected node${selectedNodeIds.length > 1 ? 's' : ''}`
              : `Upload up to ${maxFiles} ${mediaType === 'image' ? 'images' : 'PDF files'} at once`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex gap-2 border-b border-[#E5E7EB]">
            <button
              onClick={() => setMode('upload')}
              className={`flex-1 py-2 text-[13px] font-medium transition-colors border-b-2 ${
                mode === 'upload'
                  ? 'border-[#1A1D21] text-[#1A1D21]'
                  : 'border-transparent text-[#6B7280] hover:text-[#1A1D21]'
              }`}
            >
              Upload Files
            </button>
            <button
              onClick={() => setMode('url')}
              className={`flex-1 py-2 text-[13px] font-medium transition-colors border-b-2 ${
                mode === 'url'
                  ? 'border-[#1A1D21] text-[#1A1D21]'
                  : 'border-transparent text-[#6B7280] hover:text-[#1A1D21]'
              }`}
            >
              From URL
            </button>
          </div>

          {mode === 'upload' ? (
            <>
              {/* Upload Area */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-8 text-center hover:border-[#1A1D21] transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptedTypes}
                  multiple={maxFiles > 1}
                  onChange={(e) => {
                    handleFilesSelected(e.target.files);
                    // Reset the input so the same file can be selected again
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                {mediaType === 'image' ? (
                  <ImageIcon className="h-12 w-12 text-[#F59E0B] mx-auto mb-3" />
                ) : (
                  <FileText className="h-12 w-12 text-[#EF4444] mx-auto mb-3" />
                )}
                <div className="text-[14px] font-medium text-[#1A1D21] mb-1">
                  Click to upload or drag and drop
                </div>
                <div className="text-[12px] text-[#6B7280]">
                  {mediaType === 'image' ? 'PNG, JPG, GIF, WebP' : 'PDF'} (max {MAX_FILE_SIZE / (1024 * 1024)}MB)
                </div>
                {maxFiles > 1 && (
                  <div className="text-[11px] text-[#6B7280] mt-1">
                    Upload up to {maxFiles} files
                  </div>
                )}
              </div>

              {/* Files List */}
              {files.length > 0 && (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {files.map((fileWithPreview) => (
                    <div
                      key={fileWithPreview.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg transition-all ${
                        fileWithPreview.uploading
                          ? 'border-[#1A1D21] bg-[#F9FAFB] shadow-sm'
                          : 'border-[#E5E7EB]'
                      }`}
                    >
                      {/* Preview/Icon */}
                      {mediaType === 'image' && fileWithPreview.preview ? (
                        <img
                          src={fileWithPreview.preview}
                          alt={fileWithPreview.file.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-[#F5F5F7] rounded flex items-center justify-center">
                          {mediaType === 'image' ? (
                            <ImageIcon className="h-6 w-6 text-[#F59E0B]" />
                          ) : (
                            <FileText className="h-6 w-6 text-[#EF4444]" />
                          )}
                        </div>
                      )}

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[#1A1D21] truncate">
                          {fileWithPreview.file.name}
                        </div>
                        <div className="text-[11px] text-[#6B7280]">
                          {(fileWithPreview.file.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                        {fileWithPreview.error && (
                          <div className="text-[11px] text-[#EF4444] mt-1">
                            {fileWithPreview.error}
                          </div>
                        )}
                        {fileWithPreview.uploading && (
                          <div className="mt-1.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-[#1A1D21] to-[#4B5563] transition-all duration-200 ease-out"
                                  style={{ width: `${fileWithPreview.progress || 0}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-medium text-[#1A1D21] tabular-nums min-w-[40px] text-right">
                                {fileWithPreview.progress || 0}%
                              </span>
                            </div>
                            <div className="text-[10px] text-[#6B7280] mt-0.5">
                              Uploading...
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Remove Button / Upload Indicator */}
                      {!fileWithPreview.uploading && !fileWithPreview.error && (
                        <button
                          onClick={() => removeFile(fileWithPreview.id)}
                          className="p-1 hover:bg-[#F5F5F7] rounded transition-colors"
                        >
                          <X className="h-4 w-4 text-[#6B7280]" />
                        </button>
                      )}
                      {fileWithPreview.error && !fileWithPreview.uploading && (
                        <button
                          onClick={() => removeFile(fileWithPreview.id)}
                          className="p-1 hover:bg-[#FEF2F2] rounded transition-colors"
                        >
                          <X className="h-4 w-4 text-[#EF4444]" />
                        </button>
                      )}
                      {fileWithPreview.uploading && (
                        <div className="flex items-center justify-center w-8 h-8">
                          <Loader2 className="h-5 w-5 animate-spin text-[#1A1D21]" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button */}
              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  disabled={isUploading}
                  className="flex-1 px-4 py-2 text-[13px] text-[#6B7280] border border-[#E5E7EB] rounded-lg hover:border-[#1A1D21] hover:text-[#1A1D21] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadFilesToNodes}
                  disabled={!hasValidFiles || isUploading}
                  className="flex-1 px-4 py-2 text-[13px] bg-[#1A1D21] text-white rounded-lg hover:bg-[#000000] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isUploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </span>
                  ) : (
                    `Upload ${files.length > 0 ? `(${files.filter((f) => !f.error).length})` : ''}`
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* URL Input */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUrlSubmit();
                    if (e.key === 'Escape') handleClose();
                  }}
                  placeholder={`https://example.com/${mediaType === 'image' ? 'image.jpg' : 'document.pdf'}`}
                  className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#1A1D21] focus:ring-1 focus:ring-[#1A1D21] transition-all"
                  autoFocus
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 text-[13px] text-[#6B7280] border border-[#E5E7EB] rounded-lg hover:border-[#1A1D21] hover:text-[#1A1D21] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUrlSubmit}
                    disabled={!urlInput.trim()}
                    className="flex-1 px-4 py-2 text-[13px] bg-[#1A1D21] text-white rounded-lg hover:bg-[#000000] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Add from URL
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
