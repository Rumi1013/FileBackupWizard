import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

// Icons
import { LayoutGrid, Tags, FolderPlus, FileText, CheckSquare, BookOpen, Plus, FileQuestion } from 'lucide-react';

// Helper for determining text color based on background
const isDarkColor = (hexColor: string): boolean => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
};

interface TagPresetManagerProps {
  fileId?: string;
  filePath?: string;
  onTagsChanged?: () => void;
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

export default function TagPresetManager({ fileId, filePath, onTagsChanged }: TagPresetManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<TagPreset | null>(null);
  const [selectedTags, setSelectedTags] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>('presets');

  // Create a tag from preset
  const createTagMutation = useMutation({
    mutationFn: async (tag: Omit<PresetTag, 'id' | 'createdAt'>) => {
      return await apiRequest<ApiResponse>('POST', '/api/tags', tag);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tags'] });
      toast({
        title: "Tag created",
        description: "Tag has been created successfully"
      });
    }
  });

  // Add tag to file
  const addTagToFileMutation = useMutation({
    mutationFn: async ({ fileId, tagId }: { fileId: string, tagId: string }) => {
      return await apiRequest('POST', '/api/tags/map', { fileId, tagId });
    },
    onSuccess: () => {
      if (fileId) {
        queryClient.invalidateQueries({ queryKey: ['/api/tags/file', fileId] });
      }
      toast({
        title: "Tag applied",
        description: "Tag has been added to the file"
      });
    }
  });

  // Apply AI tags
  const applyAiTagsMutation = useMutation({
    mutationFn: async (path: string) => {
      // First get recommendations
      const recommendations = await apiRequest<ApiResponse>('GET', `/api/ai-tags/recommend?filePath=${encodeURIComponent(path)}`);
      
      // Then apply the top recommendations
      if (recommendations.data && recommendations.data.length > 0) {
        return await apiRequest('POST', '/api/ai-tags/apply', { 
          filePath: path, 
          recommendation: recommendations.data[0] 
        });
      }
      throw new Error('No tag recommendations available');
    },
    onSuccess: () => {
      if (fileId) {
        queryClient.invalidateQueries({ queryKey: ['/api/tags/file', fileId] });
      }
      toast({
        title: "AI Tags Applied",
        description: "Intelligent tags have been applied to the file"
      });
      if (onTagsChanged) onTagsChanged();
    },
    onError: (error) => {
      toast({
        title: "Error Applying AI Tags",
        description: `${error}`,
        variant: "destructive"
      });
    }
  });

  // Apply selected tags from preset
  const applyPresetTags = async () => {
    if (!fileId || !selectedPreset) return;
    
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
    
    try {
      // Create and apply each tag
      for (const tag of tagsToApply) {
        const result = await createTagMutation.mutateAsync({
          name: tag.name,
          emoji: tag.emoji,
          color: tag.color,
          description: tag.description
        });
        
        if (result.data && result.data.id) {
          await addTagToFileMutation.mutateAsync({
            fileId,
            tagId: result.data.id
          });
        }
      }
      
      setIsDialogOpen(false);
      setSelectedPreset(null);
      setSelectedTags({});
      
      toast({
        title: "Tags Applied",
        description: `${tagsToApply.length} tags applied from "${selectedPreset.name}" preset`
      });
      
      if (onTagsChanged) onTagsChanged();
    } catch (error) {
      toast({
        title: "Error applying tags",
        description: `${error}`,
        variant: "destructive"
      });
    }
  };

  // Apply AI tag
  const applyAiTag = () => {
    if (!filePath) {
      toast({
        title: "Missing file path",
        description: "Cannot apply AI tags without a file path",
        variant: "destructive"
      });
      return;
    }
    
    applyAiTagsMutation.mutate(filePath);
  };

  // Handle preset selection
  const selectPreset = (preset: TagPreset) => {
    setSelectedPreset(preset);
    const initialSelection = preset.tags.reduce((acc, tag) => {
      acc[tag.name] = false;
      return acc;
    }, {} as Record<string, boolean>);
    setSelectedTags(initialSelection);
  };

  // Toggle tag selection
  const toggleTag = (tagName: string) => {
    setSelectedTags(prev => ({
      ...prev,
      [tagName]: !prev[tagName]
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

  return (
    <>
      <div className="flex flex-col space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Template-Based Organization
            </CardTitle>
            <CardDescription>
              Apply consistent tags using organizational templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="presets" className="flex items-center gap-1">
                  <Tags className="h-4 w-4" />
                  <span>Tag Presets</span>
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center gap-1">
                  <FileQuestion className="h-4 w-4" />
                  <span>AI Tagging</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="presets" className="space-y-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Select a tag preset to apply organized tag collections to your files
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tagPresets.map(preset => (
                    <Button 
                      key={preset.id}
                      variant="outline" 
                      className="h-auto py-3 px-4 justify-start text-left flex flex-col items-start gap-1 hover:bg-muted/50"
                      onClick={() => {
                        selectPreset(preset);
                        setIsDialogOpen(true);
                      }}
                    >
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-xs text-muted-foreground">{preset.description}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {preset.tags.slice(0, 4).map((tag, i) => (
                          <Badge 
                            key={`${preset.id}-${i}`}
                            variant="secondary"
                            className="text-xs"
                            style={{ 
                              backgroundColor: tag.color, 
                              color: isDarkColor(tag.color) ? 'white' : 'black' 
                            }}
                          >
                            {tag.emoji}
                          </Badge>
                        ))}
                        {preset.tags.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{preset.tags.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="ai" className="space-y-4">
                <div className="flex flex-col space-y-4 p-4 border rounded-md">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 rounded-full p-2">
                      <FileQuestion className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium">AI-Powered Tag Recommendations</h3>
                      <p className="text-sm text-muted-foreground">
                        Let AI analyze your file content and suggest relevant tags based on Midnight Magnolia's organizational system
                      </p>
                      <Button 
                        onClick={applyAiTag} 
                        disabled={!filePath || applyAiTagsMutation.isPending}
                        className="mt-2"
                      >
                        {applyAiTagsMutation.isPending ? 'Analyzing...' : 'Apply AI Tags'}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="text-sm p-4 border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30 rounded-md">
                  <h4 className="font-medium mb-1">How It Works</h4>
                  <p className="text-muted-foreground mb-2">
                    The AI will:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>Analyze your file content</li>
                    <li>Recommend tags based on Midnight Magnolia's organizational system</li>
                    <li>Generate tags optimized for neurodivergent-friendly organization</li>
                    <li>Focus on priority, status, type, and monetization potential</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Preset Selection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPreset?.name}</DialogTitle>
            <DialogDescription>
              {selectedPreset?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Select tags to apply</h3>
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
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {selectedPreset?.tags.map((tag, index) => (
                <div key={index} className="flex items-center space-x-3 border rounded-md p-3">
                  <Checkbox 
                    id={`tag-${index}`} 
                    checked={selectedTags[tag.name] || false}
                    onCheckedChange={() => toggleTag(tag.name)}
                  />
                  <div className="flex flex-col flex-1 ml-2">
                    <Label 
                      htmlFor={`tag-${index}`}
                      className="font-medium cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Badge
                          style={{ 
                            backgroundColor: tag.color, 
                            color: isDarkColor(tag.color) ? 'white' : 'black' 
                          }}
                        >
                          {tag.emoji} {tag.name}
                        </Badge>
                      </span>
                    </Label>
                    <span className="text-xs text-muted-foreground mt-1">
                      {tag.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={applyPresetTags} disabled={!fileId}>Apply Selected Tags</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}