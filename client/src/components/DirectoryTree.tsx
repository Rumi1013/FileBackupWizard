import { Fragment, useState } from "react";
import { ChevronRight, ChevronDown, File, Folder } from "lucide-react";
import type { DirectoryEntry } from "@shared/schema";
import { Button } from "@/components/ui/button";

interface DirectoryTreeProps {
  data: DirectoryEntry;
  onSelect?: (path: string) => void;
}

export function DirectoryTree({ data, onSelect }: DirectoryTreeProps) {
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

  const renderNode = (node: DirectoryEntry, level: number = 0) => {
    const isExpanded = expanded.has(node.path);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <Fragment key={node.path}>
        <div 
          className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer
            ${node.type === 'file' ? 'hover:bg-accent' : 'hover:bg-muted'}`}
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
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          {!hasChildren && <span className="w-6" />}

          {node.type === 'directory' ? (
            <Folder className="h-4 w-4 text-blue-500" />
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

        {isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </Fragment>
    );
  };

  return (
    <div className="border rounded-lg p-4">
      {renderNode(data)}
    </div>
  );
}