import { useState } from "react";
import { ChevronRight, ChevronDown, File, Folder, Check, Square } from "lucide-react";
import type { DirectoryEntry } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DirectoryTreeProps {
  data: DirectoryEntry;
  onSelect?: (path: string) => void;
  currentPath?: string;
  multiSelect?: boolean;
  selectedDirs?: Set<string>;
  onMultiSelectChange?: (paths: Set<string>) => void;
  isProcessingBatch?: boolean;
}

export function DirectoryTree({ 
  data, 
  onSelect, 
  multiSelect = false, 
  selectedDirs = new Set<string>(),
  onMultiSelectChange,
  isProcessingBatch = false
}: DirectoryTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expanded);
    if (expanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpanded(newExpanded);
  };

  const handleSelect = (node: DirectoryEntry) => {
    if (node.type === 'file' && onSelect) {
      onSelect(node.path);
    }
  };
  
  const handleDirSelect = (node: DirectoryEntry, e: React.MouseEvent) => {
    if (!multiSelect || !onMultiSelectChange || node.type !== 'directory') return;
    
    e.stopPropagation();
    
    const newSelected = new Set(selectedDirs);
    if (selectedDirs.has(node.path)) {
      newSelected.delete(node.path);
    } else {
      newSelected.add(node.path);
    }
    
    onMultiSelectChange(newSelected);
  };

  const renderNode = (node: DirectoryEntry, level: number = 0) => {
    const isExpanded = expanded.has(node.path);
    const hasChildren = node.children && node.children.length > 0;
    const children = node.children || [];
    const isSelected = selectedDirs.has(node.path);

    return (
      <div key={node.path}>
        <div 
          className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer
            ${node.type === 'file' ? 'hover:bg-accent' : 'hover:bg-muted'}
            ${isSelected && node.type === 'directory' ? 'bg-muted/70' : ''}`}
          style={{ paddingLeft: `${level * 20}px` }}
          onClick={() => handleSelect(node)}
        >
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.path);
              }}
              disabled={isProcessingBatch}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          {!hasChildren && <span className="w-6" />}

          {multiSelect && node.type === 'directory' ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => {
                      const newSelected = new Set(selectedDirs);
                      if (isSelected) {
                        newSelected.delete(node.path);
                      } else {
                        newSelected.add(node.path);
                      }
                      if (onMultiSelectChange) {
                        onMultiSelectChange(newSelected);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    disabled={isProcessingBatch}
                    className="mr-1 data-[state=checked]:border-primary"
                  />
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Select for batch processing</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}

          {node.type === 'directory' ? (
            <Folder 
              className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-blue-500'}`} 
              onClick={(e) => handleDirSelect(node, e)}
            />
          ) : (
            <File className="h-4 w-4 text-gray-500" />
          )}

          <span className="text-sm">{node.name}</span>
          {node.size && (
            <span className="text-xs text-muted-foreground">
              ({Math.round(node.size / 1024)} KB)
            </span>
          )}
        </div>

        {isExpanded && children.length > 0 && (
          <div>
            {children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border rounded-lg p-4">
      {renderNode(data)}
    </div>
  );
}