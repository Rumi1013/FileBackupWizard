import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { tagPresets, TagPreset, PresetTag } from '@shared/tag-presets';
import { useToast } from "@/hooks/use-toast";

// UI components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

// Icons
import { Boxes, Tags, FolderInput, Check, X, LayoutGrid, FileSearch, Tag } from 'lucide-react';

// Helper for determining text color based on background
const isDarkColor = (hexColor: string): boolean => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
};

interface BatchTagOrganizerProps {
  filePaths: string[];
  onComplete?: () => void;
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

interface BatchTagOperation {
  filePath: string;
  recommendations: PresetTag[];
}

export default function BatchTagOrganizer({ filePaths, onComplete }: BatchTagOrganizerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<TagPreset | null>(null);
  const [selectedTags, setSelectedTags] = useState<Record<string, boolean>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState(0);
  const [isTagging, setIsTagging] = useState(false);
  const [taggedCount, setTaggedCount] = useState(0);
  const [totalTagCount, setTotalTagCount] = useState(0);

  // Initialize the selected files
  useEffect(() => {
    const initialFileSelection = filePaths.reduce((acc, path) => {
      acc[path] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setSelectedFiles(initialFileSelection);
  }, [filePaths]);

  // Create a tag from preset
  const createTagMutation = useMutation({
    mutationFn: async (tag: Omit<PresetTag, 'id' | 'createdAt'>) => {
      return await apiRequest<ApiResponse>('POST', '/api/tags', tag);
    }
  });

  // Add tag to file
  const addTagToFileMutation = useMutation({
    mutationFn: async ({ fileId, tagId }: { fileId: string, tagId: string }) => {
      return await apiRequest('POST', '/api/tags/map', { fileId, tagId });
    }
  });

  // Apply tags in batch
  const applyBatchTagsMutation = useMutation({
    mutationFn: async (operations: BatchTagOperation[]) => {
      return await apiRequest('POST', '/api/ai-tags/apply-batch', { items: operations });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tags'] });
      
      // Show toast only after all operations complete
      toast({
        title: "Batch Tagging Complete",
        description: `Applied tags to ${taggedCount} files`,
      });
      
      if (onComplete) onComplete();
    },
    onError: (error) => {
      toast({
        title: "Error during batch tagging",
        description: `${error}`,
        variant: "destructive"
      });
    }
  });

  // Handle preset selection
  const selectPreset = (presetId: string) => {
    const preset = tagPresets.find(p => p.id === presetId);
    if (preset) {
      setSelectedPreset(preset);
      const initialSelection = preset.tags.reduce((acc, tag) => {
        acc[tag.name] = true; // Default all to selected
        return acc;
      }, {} as Record<string, boolean>);
      setSelectedTags(initialSelection);
    }
  };

  // Toggle tag selection
  const toggleTag = (tagName: string) => {
    setSelectedTags(prev => ({
      ...prev,
      [tagName]: !prev[tagName]
    }));
  };

  // Toggle file selection
  const toggleFile = (filePath: string) => {
    setSelectedFiles(prev => ({
      ...prev,
      [filePath]: !prev[filePath]
    }));
  };

  // Select/deselect all tags in the preset
  const toggleAllTags = (select: boolean) => {
    if (!selectedPreset) return;
    
    const newSelection = selectedPreset.tags.reduce((acc, tag) => {
      acc[tag.name] = select;
      return acc;
    }, {} as Record<string, boolean>);
    
    setSelectedTags(newSelection);
  };

  // Select/deselect all files
  const toggleAllFiles = (select: boolean) => {
    const newSelection = filePaths.reduce((acc, path) => {
      acc[path] = select;
      return acc;
    }, {} as Record<string, boolean>);
    
    setSelectedFiles(newSelection);
  };

  // Apply selected tags to all selected files
  const applyTagsToFiles = async () => {
    if (!selectedPreset) return;
    
    // Get selected tags from the preset
    const tagsToApply = selectedPreset.tags.filter(tag => selectedTags[tag.name]);
    
    if (tagsToApply.length === 0) {
      toast({
        title: "No tags selected",
        description: "Please select at least one tag to apply",
        variant: "destructive"
      });
      return;
    }
    
    // Get selected files
    const filesToTag = filePaths.filter(path => selectedFiles[path]);
    
    if (filesToTag.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to tag",
        variant: "destructive"
      });
      return;
    }

    setIsTagging(true);
    setProgress(0);
    setTaggedCount(0);
    setTotalTagCount(filesToTag.length * tagsToApply.length);
    
    try {
      // Prepare batch operations
      const operations: BatchTagOperation[] = filesToTag.map(filePath => ({
        filePath,
        recommendations: tagsToApply
      }));
      
      // Apply batch operations
      await applyBatchTagsMutation.mutateAsync(operations);
      
      setIsDialogOpen(false);
      setSelectedPreset(null);
      setSelectedTags({});
      setSelectedFiles({});
      
    } catch (error) {
      console.error('Error during batch tagging:', error);
    } finally {
      setIsTagging(false);
    }
  };

  // Get the count of selected files and tags
  const getSelectionCounts = () => {
    const selectedFileCount = Object.values(selectedFiles).filter(Boolean).length;
    const selectedTagCount = selectedPreset 
      ? Object.values(selectedTags).filter(Boolean).length 
      : 0;
    
    return { selectedFileCount, selectedTagCount };
  };

  const { selectedFileCount, selectedTagCount } = getSelectionCounts();

  return (
    <div>
      <Button 
        onClick={() => setIsDialogOpen(true)}
        variant="outline"
        className="w-full flex items-center gap-2"
        disabled={filePaths.length === 0}
      >
        <Boxes className="h-4 w-4" />
        Batch Apply Tag Templates
      </Button>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Batch Tag Organization</DialogTitle>
            <DialogDescription>
              Apply consistent tag templates to multiple files at once
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2">
            <div className="mb-4">
              <Label htmlFor="tag-preset">Select a tag template</Label>
              <Select onValueChange={selectPreset}>
                <SelectTrigger id="tag-preset" className="w-full">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {tagPresets.map(preset => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedPreset && (
              <div className="space-y-4">
                <div className="border rounded-md p-3">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="font-medium flex items-center gap-2">
                        <Tags className="h-4 w-4" />
                        Tags to Apply
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedPreset.description}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleAllTags(true)}
                      >
                        Select All
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleAllTags(false)}
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {selectedPreset.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        style={{ 
                          backgroundColor: selectedTags[tag.name] ? tag.color : 'transparent', 
                          color: selectedTags[tag.name] ? (isDarkColor(tag.color) ? 'white' : 'black') : 'inherit',
                          borderColor: tag.color,
                          border: '1px solid'
                        }}
                        className="cursor-pointer p-1 flex items-center gap-1"
                        onClick={() => toggleTag(tag.name)}
                      >
                        <div className="flex items-center gap-1">
                          {tag.emoji} {tag.name}
                        </div>
                        {selectedTags[tag.name] ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="border rounded-md p-3">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="font-medium flex items-center gap-2">
                        <FolderInput className="h-4 w-4" />
                        Files to Process
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {filePaths.length} files available
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleAllFiles(true)}
                      >
                        Select All
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleAllFiles(false)}
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>
                  
                  <ScrollArea className="h-[200px]">
                    <div className="grid grid-cols-1 gap-2">
                      {filePaths.map((path, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`file-${index}`} 
                            checked={selectedFiles[path] || false}
                            onCheckedChange={() => toggleFile(path)}
                          />
                          <Label 
                            htmlFor={`file-${index}`}
                            className="text-xs font-mono truncate cursor-pointer"
                          >
                            {path.split('/').pop()}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                
                <div className="bg-muted/30 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm">
                      <span className="font-medium">Summary:</span> Applying {selectedTagCount} tags to {selectedFileCount} files
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedTagCount * selectedFileCount} total operations
                    </div>
                  </div>
                  
                  {isTagging && (
                    <>
                      <Progress value={progress} className="h-1.5 w-full" />
                      <p className="text-xs text-center mt-1">Processing...</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={applyTagsToFiles} 
              disabled={!selectedPreset || selectedTagCount === 0 || selectedFileCount === 0 || isTagging}
              className="gap-2"
            >
              <Tag className="h-4 w-4" />
              Apply Tags to Files
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}