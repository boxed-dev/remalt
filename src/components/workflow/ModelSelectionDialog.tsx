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

import { OpenAI, Gemini, Anthropic, DeepSeek, XAI } from '@lobehub/icons';

const PROVIDER_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  OpenAI: OpenAI,
  Google: Gemini,
  Anthropic: Anthropic,
  DeepSeek: DeepSeek,
  XAi: XAI,
};

interface ModelSelectionDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  currentModel: string;
  onSelectModel: (modelId: string) => void;
  trigger?: React.ReactNode; // Custom trigger button
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
        'w-full flex items-center gap-2 px-2 py-1 text-left transition-colors hover:bg-gray-50 rounded group',
        isSelected && 'bg-blue-50/50 hover:bg-blue-50/50'
      )}
    >
      {/* Provider icon */}
      {ProviderIcon && (
        <ProviderIcon
          className="w-3.5 h-3.5 flex-shrink-0"
          style={{ color: provider?.colors.primary }}
        />
      )}

      {/* Model name */}
      <span className={cn(
        'text-xs flex-1 font-normal',
        isSelected ? 'text-gray-900' : 'text-gray-700'
      )}>
        {model.displayName}
      </span>

      {/* Badge */}
      {model.badge && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-medium">
          {model.badge}
        </span>
      )}

      {/* Selection check */}
      {isSelected && <Check className="w-3 h-3 text-blue-600 flex-shrink-0" />}
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
      <div className="px-2 pt-1.5 pb-0.5">
        <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <div className="space-y-0.5 px-1">
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
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  currentModel,
  onSelectModel,
  trigger,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;

  const handleSelect = (modelId: string) => {
    onSelectModel(modelId);
    setOpen(false);
  };

  const smartModels = getModelsByTier('smart');
  const cheapModels = getModelsByTier('cheap');

  const providerId = getProviderForModel(currentModel);
  const provider = getProviderInfo(providerId);
  const ProviderIcon = provider ? PROVIDER_ICONS[provider.iconName] : null;

  // Default trigger button if no custom trigger provided
  const defaultTrigger = (
    <button
      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
    >
      {ProviderIcon && (
        <ProviderIcon
          className="w-3.5 h-3.5 flex-shrink-0"
          style={{ color: provider?.colors.primary }}
        />
      )}
      <span className="text-xs font-normal text-gray-900">
        {getModelDisplayName(currentModel)}
      </span>
      <ChevronDown className="w-3 h-3 text-gray-400" />
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent
        className="w-52 p-1"
        align="start"
        side="top"
        sideOffset={4}
      >
        <div className="max-h-[280px] overflow-y-auto">
          <TierSection
            title="Smart (higher credits)"
            models={smartModels}
            currentModel={currentModel}
            onSelectModel={handleSelect}
          />

          {smartModels.length > 0 && cheapModels.length > 0 && (
            <div className="my-1 mx-1.5 border-t border-gray-100" />
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
