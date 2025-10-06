'use client';

import { useEffect, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const ZOOM_LEVELS = [25, 50, 75, 100, 150, 200];

export function ZoomIndicator() {
  const { getViewport, setViewport, fitView } = useReactFlow();
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    const updateZoom = () => {
      const viewport = getViewport();
      setZoomLevel(Math.round(viewport.zoom * 100));
    };

    // Initial zoom
    updateZoom();

    // Update on viewport change
    const interval = setInterval(updateZoom, 100);
    return () => clearInterval(interval);
  }, [getViewport]);

  const handleZoomTo = (level: number) => {
    const viewport = getViewport();
    setViewport({
      ...viewport,
      zoom: level / 100,
    }, {
      duration: 200,
    });
  };

  const handleFitView = () => {
    fitView({ duration: 200, padding: 0.2 });
  };

  const handleResetZoom = () => {
    const viewport = getViewport();
    setViewport({
      ...viewport,
      zoom: 1,
    }, {
      duration: 200,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-[13px] font-medium text-[#6B7280] hover:text-[#095D40] hover:bg-[#D4AF7F]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#095D40]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors"
        >
          <span>{zoomLevel}%</span>
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {ZOOM_LEVELS.map((level) => (
          <DropdownMenuItem
            key={level}
            onClick={() => handleZoomTo(level)}
            className="cursor-pointer"
          >
            {level}%
            {level === 100 && (
              <span className="ml-auto text-xs text-[#9CA3AF]">Cmd+0</span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleFitView} className="cursor-pointer">
          Fit View
          <span className="ml-auto text-xs text-[#9CA3AF]">Cmd+1</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleResetZoom} className="cursor-pointer">
          Reset Zoom
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
