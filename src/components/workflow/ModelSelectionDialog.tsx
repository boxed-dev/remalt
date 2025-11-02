'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Search, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PROVIDERS,
  MODELS,
  getModelsByProvider,
  type ModelInfo,
  type ModelProvider,
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentModel: string;
  onSelectModel: (modelId: string) => void;
}

interface ModelCardProps {
  model: ModelInfo;
  provider: ModelProvider;
  isSelected: boolean;
  onSelect: () => void;
}

const ModelCard: React.FC<ModelCardProps> = ({ model, provider, isSelected, onSelect }) => {
  const ProviderIcon = PROVIDER_ICONS[provider.iconName];

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full px-3 py-2.5 rounded-md text-left transition-all flex items-center gap-2 hover:bg-muted',
        isSelected && 'bg-primary/10 border border-primary'
      )}
    >
      {/* Provider icon */}
      {ProviderIcon && (
        <ProviderIcon
          className="w-4 h-4 flex-shrink-0"
          style={{ color: provider.colors.primary }}
        />
      )}

      {/* Model name */}
      <span className="text-sm font-medium flex-1">{model.displayName}</span>

      {/* Selection check */}
      {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
    </button>
  );
};

interface ProviderSectionProps {
  provider: ModelProvider;
  models: ModelInfo[];
  currentModel: string;
  onSelectModel: (modelId: string) => void;
  searchQuery: string;
}

const ProviderSection: React.FC<ProviderSectionProps> = ({
  provider,
  models,
  currentModel,
  onSelectModel,
  searchQuery,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const ProviderIcon = PROVIDER_ICONS[provider.iconName];

  // Filter models based on search
  const filteredModels = useMemo(() => {
    if (!searchQuery) return models;
    const query = searchQuery.toLowerCase();
    return models.filter(
      (m) =>
        m.displayName.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        m.capabilities.some((c) => c.toLowerCase().includes(query))
    );
  }, [models, searchQuery]);

  if (filteredModels.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-1">
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 transition-colors group">
        <div className="flex items-center gap-2">
          {ProviderIcon && (
            <ProviderIcon
              className="w-4 h-4"
              style={{ color: provider.colors.primary }}
            />
          )}
          <span className="font-medium text-sm">{provider.name}</span>
        </div>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-1">
        {filteredModels.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            provider={provider}
            isSelected={currentModel === model.id}
            onSelect={() => onSelectModel(model.id)}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

export const ModelSelectionDialog: React.FC<ModelSelectionDialogProps> = ({
  open,
  onOpenChange,
  currentModel,
  onSelectModel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelect = (modelId: string) => {
    onSelectModel(modelId);
    onOpenChange(false);
    setSearchQuery(''); // Reset search on selection
  };

  // Group models by provider
  const providerGroups = useMemo(() => {
    return Object.values(PROVIDERS).map((provider) => ({
      provider,
      models: getModelsByProvider(provider.id),
    }));
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 flex flex-col max-h-[600px]">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b flex-shrink-0">
          <DialogTitle className="text-base mb-3">Select Model</DialogTitle>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 text-sm"
            />
          </div>
        </div>

        {/* Model list */}
        <div className="overflow-y-auto flex-1 px-4 py-3">
          <div className="space-y-3">
            {providerGroups.map(({ provider, models }) => (
              <ProviderSection
                key={provider.id}
                provider={provider}
                models={models}
                currentModel={currentModel}
                onSelectModel={handleSelect}
                searchQuery={searchQuery}
              />
            ))}

            {/* No results message */}
            {searchQuery &&
              providerGroups.every(
                ({ models }) =>
                  models.filter(
                    (m) =>
                      m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      m.description.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0
              ) && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-sm">
                    No models found matching &quot;{searchQuery}&quot;
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-sm text-primary hover:underline mt-2"
                  >
                    Clear search
                  </button>
                </div>
              )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
