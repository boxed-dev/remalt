'use client';

import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getModelsByTier,
  getProviderInfo,
  getProviderForModel,
  getModelDisplayName,
  type ModelInfo,
} from '@/lib/models/model-registry';

// Dynamic icon imports from @lobehub/icons
import { OpenAI, Gemini, Anthropic, DeepSeek } from '@lobehub/icons';

const PROVIDER_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  OpenAI: OpenAI,
  Google: Gemini,
  Anthropic: Anthropic,
  DeepSeek: DeepSeek,
};

interface ModelSelectionDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  currentModel: string;
  onSelectModel: (modelId: string) => void;
}

interface ModelItemProps {
  model: ModelInfo;
  isSelected: boolean;
  onSelect: () => void;
}

const ModelItem: React.FC<ModelItemProps> = ({ model, isSelected, onSelect }) => {
  const providerId = getProviderForModel(model.id);
  const provider = getProviderInfo(providerId);
  const ProviderIcon = provider ? PROVIDER_ICONS[provider.iconName] : null;

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-all hover:bg-gray-50 rounded-md',
        isSelected && 'bg-blue-50 hover:bg-blue-50'
      )}
    >
      {/* Provider icon */}
      {ProviderIcon && (
        <ProviderIcon
          className="w-4 h-4 flex-shrink-0"
          style={{ color: provider?.colors.primary }}
        />
      )}

      {/* Model name */}
      <span className={cn(
        'text-[13px] flex-1',
        isSelected ? 'font-medium text-gray-900' : 'text-gray-700'
      )}>
        {model.displayName}
      </span>

      {/* Selection check */}
      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
    </button>
  );
};

interface TierSectionProps {
  title: string;
  models: ModelInfo[];
  currentModel: string;
  onSelectModel: (modelId: string) => void;
}

const TierSection: React.FC<TierSectionProps> = ({ title, models, currentModel, onSelectModel }) => {
  if (models.length === 0) return null;

  return (
    <div>
      <div className="px-3 pt-2 pb-1">
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <div className="space-y-0.5 px-1.5">
        {models.map((model) => (
          <ModelItem
            key={model.id}
            model={model}
            isSelected={currentModel === model.id}
            onSelect={() => onSelectModel(model.id)}
          />
        ))}
      </div>
    </div>
  );
};

export const ModelSelectionDialog: React.FC<ModelSelectionDialogProps> = ({
  currentModel,
  onSelectModel,
}) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (modelId: string) => {
    onSelectModel(modelId);
    setOpen(false);
  };

  const smartModels = getModelsByTier('smart');
  const cheapModels = getModelsByTier('cheap');

  const providerId = getProviderForModel(currentModel);
  const provider = getProviderInfo(providerId);
  const ProviderIcon = provider ? PROVIDER_ICONS[provider.iconName] : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm"
        >
          {ProviderIcon && (
            <ProviderIcon
              className="w-4 h-4 flex-shrink-0"
              style={{ color: provider?.colors.primary }}
            />
          )}
          <span className="text-[13px] font-medium text-gray-900">
            {getModelDisplayName(currentModel)}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-56 p-1.5" 
        align="start"
        side="top"
        sideOffset={4}
      >
        <div className="max-h-[240px] overflow-y-auto">
          <TierSection
            title="Smart (higher credits)"
            models={smartModels}
            currentModel={currentModel}
            onSelectModel={handleSelect}
          />

          {smartModels.length > 0 && cheapModels.length > 0 && (
            <div className="my-1.5 mx-2 border-t border-gray-200" />
          )}

          <TierSection
            title="Cheap"
            models={cheapModels}
            currentModel={currentModel}
            onSelectModel={handleSelect}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};
