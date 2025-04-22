import { useState, useRef, useEffect } from "react";
import { ChevronRight, ChevronDown, File, Folder, Check, Square, Image, FileText, FileCode } from "lucide-react";
import type { DirectoryEntry } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DirectoryTreeProps {
  data: DirectoryEntry;
  onSelect?: (path: string) => void;
  currentPath?: string;
  selectedFile?: string | null;
  multiSelect?: boolean;
  selectedDirs?: Set<string>;
  onMultiSelectChange?: (paths: Set<string>) => void;
  isProcessingBatch?: boolean;
}

export function DirectoryTree({ 
  data, 
  onSelect, 
  currentPath,
  selectedFile = null,
  multiSelect = false, 
  selectedDirs = new Set<string>(),
  onMultiSelectChange,
  isProcessingBatch = false
}: DirectoryTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!focusedNode) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          // Find next visible node
          const nodes = Array.from(nodeRefs.current.keys());
          const currentIndex = nodes.indexOf(focusedNode);
          if (currentIndex < nodes.length - 1) {
            setFocusedNode(nodes[currentIndex + 1]);
            nodeRefs.current.get(nodes[currentIndex + 1])?.focus();
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          // Find previous visible node
          const upNodes = Array.from(nodeRefs.current.keys());
          const upCurrentIndex = upNodes.indexOf(focusedNode);
          if (upCurrentIndex > 0) {
            setFocusedNode(upNodes[upCurrentIndex - 1]);
            nodeRefs.current.get(upNodes[upCurrentIndex - 1])?.focus();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          // Expand if directory
          const node = findNodeByPath(data, focusedNode);
          if (node?.type === 'directory' && node.children?.length) {
            setExpanded(prev => new Set([...prev, focusedNode]));
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          // Collapse if expanded directory, or go to parent
          const collapseNode = findNodeByPath(data, focusedNode);
          if (collapseNode?.type === 'directory' && expanded.has(focusedNode)) {
            setExpanded(prev => {
              const newSet = new Set(prev);
              newSet.delete(focusedNode);
              return newSet;
            });
          } else {
            // Go to parent by finding the last directory in the path
            const pathParts = focusedNode.split('/');
            if (pathParts.length > 2) { // Only if we have a parent
              pathParts.pop();
              const parentPath = pathParts.join('/');
              setFocusedNode(parentPath);
              nodeRefs.current.get(parentPath)?.focus();
            }
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          // Select the node
          const selectedNode = findNodeByPath(data, focusedNode);
          if (selectedNode) {
            if (selectedNode.type === 'file' && onSelect) {
              onSelect(selectedNode.path);
            } else if (selectedNode.type === 'directory' && multiSelect && onMultiSelectChange) {
              const newSelected = new Set(selectedDirs);
              if (selectedDirs.has(selectedNode.path)) {
                newSelected.delete(selectedNode.path);
              } else {
                newSelected.add(selectedNode.path);
              }
              onMultiSelectChange(newSelected);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedNode, expanded, selectedDirs, data, onSelect, multiSelect, onMultiSelectChange]);

  // Helper function to find a node by path
  const findNodeByPath = (rootNode: DirectoryEntry, path: string): DirectoryEntry | null => {
    if (rootNode.path === path) return rootNode;

    if (rootNode.children) {
      for (const child of rootNode.children) {
        const found = findNodeByPath(child, path);
        if (found) return found;
      }
    }

    return null;
  };

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
    setFocusedNode(node.path);
    if (node.type === 'file' && onSelect) {
      onSelect(node.path);
    }
  };

  const handleDirSelect = (node: DirectoryEntry, e: React.MouseEvent) => {
    if (!multiSelect || !onMultiSelectChange || node.type !== 'directory') return;

    e.stopPropagation();
    setFocusedNode(node.path);

    const newSelected = new Set(selectedDirs);
    if (selectedDirs.has(node.path)) {
      newSelected.delete(node.path);
    } else {
      newSelected.add(node.path);
    }

    onMultiSelectChange(newSelected);
  };

  // Helper function to get icon based on file name/extension
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (!extension) return <File className="h-4 w-4 text-gray-500" />;

    // Image files
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
      return <Image className="h-4 w-4 text-blue-400" />;
    }

    // Code files
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'rb', 'java', 'go', 'rs', 'php'].includes(extension)) {
      return <FileCode className="h-4 w-4 text-purple-500" />;
    }

    // Document files
    if (['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'].includes(extension)) {
      return <FileText className="h-4 w-4 text-amber-500" />;
    }

    // Default file icon
    return <File className="h-4 w-4 text-gray-500" />;
  };

  const renderNode = (node: DirectoryEntry, level: number = 0) => {
    const isExpanded = expanded.has(node.path);
    const hasChildren = node.children && node.children.length > 0;
    const children = node.children || [];
    const isSelected = selectedDirs.has(node.path);
    const isFocused = focusedNode === node.path;

    // Get file extension for styling
    const fileExtension = node.type === 'file' ? node.name.split('.').pop()?.toLowerCase() : null;

    return (
      <div key={node.path}>
        <div 
          className={`flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer select-none transition-colors file-item
            ${node.type === 'file' ? 'hover:bg-blue-100 dark:hover:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'}
            ${isSelected && node.type === 'directory' ? 'bg-gray-100 dark:bg-gray-800/50' : ''}
            ${(isFocused || (node.type === 'file' && selectedFile === node.path)) ? 
              'bg-blue-500/10 ring-1 ring-blue-500/30 dark:bg-blue-800/20 dark:ring-blue-400/20' : ''}
            ${(node.type === 'file' && selectedFile === node.path) ? 
              'bg-blue-500 text-white dark:bg-blue-600 dark:text-white' : ''}`}
          style={{ paddingLeft: `${level * 16}px` }}
          onClick={() => handleSelect(node)}
          ref={el => {
            if (el) nodeRefs.current.set(node.path, el);
          }}
          tabIndex={0}
          onFocus={() => setFocusedNode(node.path)}
          data-testid={`node-${node.path}`}
        >
          <div className="file-item-content"> {/* Added div for content */}
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.path);
              }}
              disabled={isProcessingBatch}
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          {!hasChildren && <span className="w-5" />}

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
              className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-blue-500'} 
                ${isFocused ? 'text-blue-600' : ''}`} 
              onClick={(e) => handleDirSelect(node, e)}
            />
          ) : (
            getFileIcon(node.name)
          )}

          <span className={`text-sm font-medium ${(node.type === 'file' && selectedFile === node.path) ? 'text-white' : ''}`}>
            {node.name}
          </span>

          {node.size && (
            <span className={`text-xs ${(node.type === 'file' && selectedFile === node.path) ? 'text-white/80' : 'text-muted-foreground'}`}>
              ({Math.round(node.size / 1024)} KB)
            </span>
          )}
          </div> {/* End of added div */}
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