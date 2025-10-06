'use client';

import { useState } from 'react';
import { useReactFlow, getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { toPng, toSvg } from 'html-to-image';
import { Download, FileJson, FileImage, FileCode } from 'lucide-react';
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

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = 'png' | 'svg' | 'json';
type ImageQuality = '1x' | '2x' | '3x';

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const { getNodes, getEdges, getViewport, toObject } = useReactFlow();
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [imageQuality, setImageQuality] = useState<ImageQuality>('2x');
  const [isExporting, setIsExporting] = useState(false);

  const downloadImage = async (dataUrl: string, extension: string) => {
    const a = document.createElement('a');
    a.setAttribute('download', `workflow.${extension}`);
    a.setAttribute('href', dataUrl);
    a.click();
  };

  const handleExportPNG = async () => {
    try {
      setIsExporting(true);
      const nodesBounds = getNodesBounds(getNodes());
      const viewport = getViewportForBounds(
        nodesBounds,
        nodesBounds.width,
        nodesBounds.height,
        0.5,
        2
      );

      const scale = parseInt(imageQuality.replace('x', ''));
      const imageWidth = nodesBounds.width * scale;
      const imageHeight = nodesBounds.height * scale;

      const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewportElement) return;

      const dataUrl = await toPng(viewportElement, {
        backgroundColor: '#FAFBFC',
        width: imageWidth,
        height: imageHeight,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom * scale})`,
        },
      });

      downloadImage(dataUrl, 'png');
    } catch (error) {
      console.error('Error exporting PNG:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSVG = async () => {
    try {
      setIsExporting(true);
      const nodesBounds = getNodesBounds(getNodes());
      const viewport = getViewportForBounds(
        nodesBounds,
        nodesBounds.width,
        nodesBounds.height,
        0.5,
        2
      );

      const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewportElement) return;

      const dataUrl = await toSvg(viewportElement, {
        backgroundColor: '#FAFBFC',
        width: nodesBounds.width,
        height: nodesBounds.height,
        style: {
          width: `${nodesBounds.width}px`,
          height: `${nodesBounds.height}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      });

      downloadImage(dataUrl, 'svg');
    } catch (error) {
      console.error('Error exporting SVG:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJSON = () => {
    try {
      setIsExporting(true);
      const flowObject = toObject();
      const json = JSON.stringify(flowObject, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.setAttribute('download', 'workflow.json');
      a.setAttribute('href', url);
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting JSON:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = () => {
    if (exportFormat === 'png') {
      handleExportPNG();
    } else if (exportFormat === 'svg') {
      handleExportSVG();
    } else {
      handleExportJSON();
    }
  };

  const formats: { value: ExportFormat; label: string; icon: any; description: string }[] = [
    {
      value: 'png',
      label: 'PNG Image',
      icon: FileImage,
      description: 'Raster image format, best for sharing and presentations',
    },
    {
      value: 'svg',
      label: 'SVG Vector',
      icon: FileCode,
      description: 'Scalable vector format, perfect for editing and printing',
    },
    {
      value: 'json',
      label: 'JSON Data',
      icon: FileJson,
      description: 'Workflow data structure, useful for backup and migration',
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-semibold text-[#1A1D21]">
            Export Workflow
          </DialogTitle>
          <DialogDescription className="text-[14px] text-[#6B7280]">
            Choose a format to export your workflow canvas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-[#1A1D21]">Export Format</Label>
            <div className="grid gap-2">
              {formats.map((format) => (
                <button
                  key={format.value}
                  onClick={() => setExportFormat(format.value)}
                  className={`
                    flex items-start gap-3 p-3 rounded-lg border transition-all text-left
                    ${
                      exportFormat === format.value
                        ? 'border-[#095D40] bg-[#095D40]/5 ring-2 ring-[#095D40]/20'
                        : 'border-[#E8ECEF] hover:border-[#D4AF7F]/50 hover:bg-[#FAFBFC]'
                    }
                  `}
                >
                  <div
                    className={`
                      w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0
                      ${
                        exportFormat === format.value
                          ? 'bg-[#095D40] text-white'
                          : 'bg-[#F3F4F6] text-[#6B7280]'
                      }
                    `}
                  >
                    <format.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-[#1A1D21]">{format.label}</div>
                    <div className="text-xs text-[#6B7280] mt-0.5">{format.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {(exportFormat === 'png' || exportFormat === 'svg') && (
            <div className="space-y-2">
              <Label htmlFor="quality" className="text-sm font-medium text-[#1A1D21]">
                Image Quality
              </Label>
              <Select value={imageQuality} onValueChange={(v) => setImageQuality(v as ImageQuality)}>
                <SelectTrigger id="quality" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1x">1x - Standard (faster export)</SelectItem>
                  <SelectItem value="2x">2x - High Quality (recommended)</SelectItem>
                  <SelectItem value="3x">3x - Ultra High Quality</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#E8ECEF] hover:bg-[#FAFBFC]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-[#095D40] hover:bg-[#095D40]/90 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
