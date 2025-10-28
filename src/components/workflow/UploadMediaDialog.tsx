'use client'

import { useState, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Image, FileText, Loader2, Upload, CheckCircle2, X } from 'lucide-react'
import type { NodeType } from '@/types/workflow'

interface UploadedFile {
  cdnUrl: string
  uuid?: string
  name?: string
  size?: number
}

interface UploadMediaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodeType: 'image' | 'pdf'
  onAddNodes: (files: UploadedFile[]) => void
}

// Maximum file size: 50MB (for PDFs)
const MAX_FILE_SIZE = 50 * 1024 * 1024

const formatFileSize = (bytes?: number) => {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`
  return `${mb.toFixed(1)} MB`
}

export function UploadMediaDialog({ open, onOpenChange, nodeType, onAddNodes }: UploadMediaDialogProps) {
  const [UploaderComponent, setUploader] = useState<React.ComponentType<any> | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // Load uploader component when dialog opens
  useEffect(() => {
    if (open && !UploaderComponent) {
      import('@uploadcare/react-uploader/next').then(({ FileUploaderInline }) => {
        setUploader(() => FileUploaderInline)
      })
    }
  }, [open, UploaderComponent])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setUploadedFiles([])
      setIsUploading(false)
    }
  }, [open])

  const handleUploaderChange = useCallback(({ allEntries }: { allEntries?: Array<{ status: string; cdnUrl?: string; uuid?: string; name?: string; size?: number }> }) => {
    if (!allEntries) return

    // Check if any files are still uploading
    const uploading = allEntries.some((entry) => entry.status === 'uploading')
    setIsUploading(uploading)

    // Collect all successfully uploaded files
    const completed = allEntries
      .filter((entry) => entry.status === 'success' && entry.cdnUrl)
      .map((entry) => ({
        cdnUrl: entry.cdnUrl!,
        uuid: entry.uuid,
        name: entry.name,
        size: entry.size,
      }))

    setUploadedFiles(completed)
  }, [])

  const handleAddToCanvas = () => {
    if (uploadedFiles.length > 0) {
      onAddNodes(uploadedFiles)
      onOpenChange(false)
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const config = {
    image: {
      title: 'Upload Images',
      description: 'Upload images to add them to your canvas. Multiple images will be arranged in a grid.',
      icon: Image,
      color: 'text-[#F59E0B]',
      bgColor: 'bg-[#FEF3C7]',
      borderColor: 'border-[#F59E0B]',
      buttonColor: 'bg-[#F59E0B] hover:bg-[#D97706]',
      sourceList: 'local, camera, gdrive, facebook',
      accept: 'image/*',
      imagesOnly: true,
      emptyText: 'Drop images here or click to browse',
      emptySubtext: 'Supports JPG, PNG, GIF, WebP',
    },
    pdf: {
      title: 'Upload PDFs',
      description: 'Upload PDF documents to add them to your canvas. Each PDF will be automatically parsed.',
      icon: FileText,
      color: 'text-[#EF4444]',
      bgColor: 'bg-[#FEF2F2]',
      borderColor: 'border-[#EF4444]',
      buttonColor: 'bg-[#EF4444] hover:bg-[#DC2626]',
      sourceList: 'local, url, gdrive, dropbox',
      accept: 'application/pdf',
      imagesOnly: false,
      emptyText: 'Drop PDFs here or click to browse',
      emptySubtext: 'Maximum file size: 50MB per PDF',
    },
  }

  const currentConfig = config[nodeType]
  const Icon = currentConfig.icon
  const totalSize = uploadedFiles.reduce((acc, file) => acc + (file.size || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold flex items-center gap-3">
            <div className={`p-2 rounded-lg ${currentConfig.bgColor}`}>
              <Icon className={`h-5 w-5 ${currentConfig.color}`} />
            </div>
            {currentConfig.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#6B7280] pt-1">
            {currentConfig.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Upload area */}
          <div className="rounded-xl overflow-hidden">
            {UploaderComponent ? (
              <div className="min-h-[320px]">
                <UploaderComponent
                  pubkey={process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY!}
                  classNameUploader="uc-light uc-purple"
                  sourceList={currentConfig.sourceList}
                  filesViewMode="grid"
                  imagesOnly={currentConfig.imagesOnly}
                  accept={currentConfig.accept}
                  multiple={true}
                  multipleMax={20}
                  maxFileSize={nodeType === 'pdf' ? MAX_FILE_SIZE : undefined}
                  userAgentIntegration="remalt-next"
                  onChange={handleUploaderChange}
                />
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-3 bg-[#FAFAFA] rounded-xl">
                <div className={`p-4 rounded-full ${currentConfig.bgColor}`}>
                  <Upload className={`h-8 w-8 ${currentConfig.color}`} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-[#1A1D21]">{currentConfig.emptyText}</p>
                  <p className="text-xs text-[#6B7280] mt-1">{currentConfig.emptySubtext}</p>
                </div>
                <Loader2 className="h-5 w-5 animate-spin text-[#6B7280]" />
              </div>
            )}
          </div>

          {/* Uploaded files list */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${currentConfig.color}`} />
                  <h3 className="text-sm font-medium text-[#1A1D21]">
                    {uploadedFiles.length} {nodeType === 'image' ? 'image' : 'file'}{uploadedFiles.length > 1 ? 's' : ''} ready
                  </h3>
                </div>
                {totalSize > 0 && (
                  <span className="text-xs text-[#6B7280]">
                    Total: {formatFileSize(totalSize)}
                  </span>
                )}
              </div>

              <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={file.uuid || index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] transition-colors group"
                  >
                    <div className={`p-2 rounded-md ${currentConfig.bgColor} flex-shrink-0`}>
                      <Icon className={`h-4 w-4 ${currentConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#1A1D21] truncate" title={file.name}>
                        {file.name || `${nodeType}.${nodeType === 'image' ? 'jpg' : 'pdf'}`}
                      </p>
                      {file.size && (
                        <p className="text-[10px] text-[#6B7280] mt-0.5">
                          {formatFileSize(file.size)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1.5 rounded-md hover:bg-[#F3F4F6] opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove"
                    >
                      <X className="h-3.5 w-3.5 text-[#6B7280] hover:text-[#EF4444]" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1 h-11"
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddToCanvas}
              disabled={uploadedFiles.length === 0 || isUploading}
              className={`flex-1 h-11 ${currentConfig.buttonColor} text-white disabled:opacity-50`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  Add to Canvas
                  {uploadedFiles.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs font-medium">
                      {uploadedFiles.length}
                    </span>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
