import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Type definition for API responses
interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Pencil, Trash2, Tag, Plus, Search, Filter, SmilePlus } from 'lucide-react';

// Helper function to determine if a color is dark (for text contrast)
const isDarkColor = (hexColor: string): boolean => {
  // Remove the # if present
  const hex = hexColor.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate luminance (perceived brightness)
  // Using the formula: 0.299*R + 0.587*G + 0.114*B
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // If luminance is less than 0.5, the color is considered dark
  return luminance < 0.5;
};

// Type definitions for tags
export interface FileTag {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description?: string;
  createdAt: string;
}

export interface TagToFileMapping {
  id: string;
  fileId: string;
  tagId: string;
  createdAt: string;
}

interface FileTagsProps {
  fileId?: string;
  showAddButton?: boolean;
  onTagsChanged?: () => void;
}

function FileTags({ fileId, showAddButton = true, onTagsChanged }: FileTagsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<FileTag | null>(null);
  const [tagForm, setTagForm] = useState({
    name: '',
    emoji: '',
    color: '#6366f1', // Default color - indigo
    description: ''
  });

  // Fetch all available tags
  const { data: allTags, isLoading: isLoadingAllTags } = useQuery<FileTag[]>({
    queryKey: ['/api/tags'],
    queryFn: async () => {
      try {
        const response = await apiRequest<ApiResponse<FileTag[]>>('GET', '/api/tags');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching tags:', error);
        return [];
      }
    }
  });

  // Fetch tags for this file if fileId is provided
  const { 
    data: fileTags, 
    isLoading: isLoadingFileTags 
  } = useQuery<FileTag[]>({
    queryKey: ['/api/tags/file', fileId],
    queryFn: async () => {
      if (!fileId) return [];
      try {
        const response = await apiRequest<ApiResponse<FileTag[]>>('GET', `/api/tags/file/${fileId}`);
        return response.data || [];
      } catch (error) {
        console.error('Error fetching file tags:', error);
        return [];
      }
    },
    enabled: !!fileId
  });

  // Create a new tag
  const createTagMutation = useMutation({
    mutationFn: async (newTag: Omit<FileTag, 'id' | 'createdAt'>) => {
      return await apiRequest<ApiResponse<FileTag>>('POST', '/api/tags', newTag);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tags'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Tag created",
        description: "Your tag has been created successfully",
      });
      if (onTagsChanged) onTagsChanged();
    },
    onError: (error) => {
      toast({
        title: "Error creating tag",
        description: `There was an error creating your tag: ${error}`,
        variant: "destructive"
      });
    }
  });

  // Update existing tag
  const updateTagMutation = useMutation({
    mutationFn: async ({ id, tag }: { id: string, tag: Partial<Omit<FileTag, 'id' | 'createdAt'>> }) => {
      return await apiRequest('PATCH', `/api/tags/${id}`, tag);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tags'] });
      if (fileId) {
        queryClient.invalidateQueries({ queryKey: ['/api/tags/file', fileId] });
      }
      setIsEditDialogOpen(false);
      setSelectedTag(null);
      resetForm();
      toast({
        title: "Tag updated",
        description: "Your tag has been updated successfully",
      });
      if (onTagsChanged) onTagsChanged();
    },
    onError: (error) => {
      toast({
        title: "Error updating tag",
        description: `There was an error updating your tag: ${error}`,
        variant: "destructive"
      });
    }
  });

  // Delete a tag
  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/tags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tags'] });
      if (fileId) {
        queryClient.invalidateQueries({ queryKey: ['/api/tags/file', fileId] });
      }
      toast({
        title: "Tag deleted",
        description: "Your tag has been deleted successfully",
      });
      if (onTagsChanged) onTagsChanged();
    },
    onError: (error) => {
      toast({
        title: "Error deleting tag",
        description: `There was an error deleting your tag: ${error}`,
        variant: "destructive"
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
        title: "Tag added to file",
        description: "The tag has been added to the file successfully",
      });
      if (onTagsChanged) onTagsChanged();
    },
    onError: (error) => {
      toast({
        title: "Error adding tag",
        description: `There was an error adding the tag to the file: ${error}`,
        variant: "destructive"
      });
    }
  });

  // Remove tag from file
  const removeTagFromFileMutation = useMutation({
    mutationFn: async ({ fileId, tagId }: { fileId: string, tagId: string }) => {
      return await apiRequest('DELETE', `/api/tags/map/${fileId}/${tagId}`);
    },
    onSuccess: () => {
      if (fileId) {
        queryClient.invalidateQueries({ queryKey: ['/api/tags/file', fileId] });
      }
      toast({
        title: "Tag removed from file",
        description: "The tag has been removed from the file successfully",
      });
      if (onTagsChanged) onTagsChanged();
    },
    onError: (error) => {
      toast({
        title: "Error removing tag",
        description: `There was an error removing the tag from the file: ${error}`,
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setTagForm({
      name: '',
      emoji: '',
      color: '#6366f1',
      description: ''
    });
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    createTagMutation.mutate(tagForm);
  };

  const handleUpdateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTag) {
      updateTagMutation.mutate({
        id: selectedTag.id,
        tag: tagForm
      });
    }
  };

  const handleEditTag = (tag: FileTag) => {
    setSelectedTag(tag);
    setTagForm({
      name: tag.name,
      emoji: tag.emoji,
      color: tag.color,
      description: tag.description || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteTag = (tag: FileTag) => {
    if (confirm(`Are you sure you want to delete the tag "${tag.name}"?`)) {
      deleteTagMutation.mutate(tag.id);
    }
  };

  const handleToggleTagOnFile = (tag: FileTag) => {
    if (!fileId) return;

    const isTaggedAlready = fileTags?.some((t: FileTag) => t.id === tag.id);
    
    if (isTaggedAlready) {
      removeTagFromFileMutation.mutate({ fileId, tagId: tag.id });
    } else {
      addTagToFileMutation.mutate({ fileId, tagId: tag.id });
    }
  };

  // State for tag search and filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Common emojis for file organization, grouped by category
  const commonEmojis = {
    'Priority': ['⭐', '🔥', '⚡', '🚨', '📌', '🏆'],
    'Status': ['✅', '❌', '⏳', '🕒', '📝', '🔄'],
    'Type': ['📄', '📊', '📁', '🖼️', '🎥', '🎵'],
    'Project': ['🏢', '🏠', '🌟', '💼', '🚀', '🎯'],
    'Personal': ['❤️', '😊', '👍', '👎', '👀', '✨'],
    'Weather': ['☀️', '🌧️', '❄️', '🌈', '☁️', '⛈️']
  };
  
  // Filter tags based on search query
  const filteredTags = allTags?.filter(tag => {
    const matchesSearch = 
      searchQuery === '' || 
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tag.emoji.includes(searchQuery) ||
      (tag.description && tag.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = 
      !selectedCategory || 
      getCategoryForEmoji(tag.emoji) === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Helper to get a likely category for an emoji
  const getCategoryForEmoji = (emoji: string): string => {
    for (const [category, emojiList] of Object.entries(commonEmojis)) {
      if (emojiList.includes(emoji)) {
        return category;
      }
    }
    return 'Other';
  };
  
  // Handle emoji selection from picker
  const handleEmojiSelect = (emoji: string) => {
    setTagForm({...tagForm, emoji});
    setShowEmojiPicker(false);
  };
  
  const isLoading = isLoadingAllTags || isLoadingFileTags;

  return (
    <div className="file-tags">
      {/* Tag list for specific file */}
      {fileId && (
        <div className="file-tag-list mb-4">
          <div className="flex items-center gap-1 flex-wrap">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading tags...</div>
            ) : fileTags && fileTags.length > 0 ? (
              fileTags.map(tag => (
                <Badge 
                  key={tag.id}
                  style={{ backgroundColor: tag.color, color: isDarkColor(tag.color) ? 'white' : 'black' }}
                  className="mr-1 mb-1 cursor-pointer hover:opacity-80"
                  onClick={() => fileId && handleToggleTagOnFile(tag)}
                >
                  {tag.emoji} {tag.name}
                </Badge>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No tags on this file</div>
            )}
          </div>
        </div>
      )}

      {/* All tags management UI */}
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium mb-2 flex items-center">
            <Tag className="w-4 h-4 mr-2" />
            {fileId ? 'Available Tags' : 'All Tags'}
          </h3>
          
          {/* Search and Filter Controls */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 w-[150px] text-sm"
              />
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2 gap-1">
                  <Filter className="h-4 w-4" />
                  <span className="sr-only md:not-sr-only md:inline-block">Filter</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="end">
                <div className="p-2">
                  <div className="font-medium text-sm mb-2">Filter by Category</div>
                  <div className="space-y-1">
                    <Button 
                      variant={selectedCategory === null ? "default" : "outline"}
                      size="sm"
                      className="w-full justify-start text-left"
                      onClick={() => setSelectedCategory(null)}
                    >
                      All Categories
                    </Button>
                    {Object.keys(commonEmojis).map(category => (
                      <Button 
                        key={category}
                        variant={selectedCategory === category ? "default" : "outline"}
                        size="sm"
                        className="w-full justify-start text-left"
                        onClick={() => setSelectedCategory(category)}
                      >
                        {category}
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          {showAddButton && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex items-center gap-1">
                  <Plus className="w-4 h-4" /> New Tag
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Tag</DialogTitle>
                  <DialogDescription>
                    Create a new tag to categorize and organize your files.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTag}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">Name</Label>
                      <Input 
                        id="name" 
                        value={tagForm.name} 
                        onChange={(e) => setTagForm({...tagForm, name: e.target.value})}
                        className="col-span-3" 
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="emoji" className="text-right">Emoji</Label>
                      <div className="col-span-3 flex items-center gap-2">
                        <Input 
                          id="emoji" 
                          value={tagForm.emoji} 
                          onChange={(e) => setTagForm({...tagForm, emoji: e.target.value})}
                          className="flex-1" 
                          required
                          placeholder="📄, 🔥, ⭐, etc."
                        />
                        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                          <PopoverTrigger asChild>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon" 
                              className="h-10 w-10"
                            >
                              <SmilePlus className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-0" align="end">
                            <div className="p-3">
                              <div className="font-medium text-sm mb-2">Common Emojis</div>
                              <Tabs defaultValue="Priority">
                                <TabsList className="grid grid-cols-3 mb-2">
                                  <TabsTrigger value="Priority">Priority</TabsTrigger>
                                  <TabsTrigger value="Status">Status</TabsTrigger>
                                  <TabsTrigger value="Type">Type</TabsTrigger>
                                </TabsList>
                                {Object.entries(commonEmojis).map(([category, emojiList]) => (
                                  <TabsContent key={category} value={category} className="mt-0">
                                    <div className="grid grid-cols-6 gap-2">
                                      {emojiList.map(emoji => (
                                        <Button
                                          key={emoji}
                                          type="button"
                                          variant="outline"
                                          className="h-10 w-10 p-0 text-lg"
                                          onClick={() => handleEmojiSelect(emoji)}
                                        >
                                          {emoji}
                                        </Button>
                                      ))}
                                    </div>
                                  </TabsContent>
                                ))}
                              </Tabs>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="color" className="text-right">Color</Label>
                      <div className="col-span-3 flex items-center gap-2">
                        <Input 
                          id="color" 
                          type="color" 
                          value={tagForm.color} 
                          onChange={(e) => setTagForm({...tagForm, color: e.target.value})}
                          className="w-12 h-8 p-0 cursor-pointer" 
                        />
                        <Input 
                          value={tagForm.color} 
                          onChange={(e) => setTagForm({...tagForm, color: e.target.value})}
                          className="flex-1" 
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="description" className="text-right">Description</Label>
                      <Input 
                        id="description" 
                        value={tagForm.description} 
                        onChange={(e) => setTagForm({...tagForm, description: e.target.value})}
                        className="col-span-3" 
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createTagMutation.isPending}>Create Tag</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* All tags list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading tags...</div>
          ) : filteredTags && filteredTags.length > 0 ? (
            filteredTags.map(tag => (
              <Card key={tag.id} className="overflow-hidden">
                <div 
                  className="h-2" 
                  style={{ backgroundColor: tag.color }}
                ></div>
                <CardHeader className="p-3 pb-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="text-xl">{tag.emoji}</span>
                    {tag.name}
                  </CardTitle>
                  {tag.description && (
                    <CardDescription className="text-xs">{tag.description}</CardDescription>
                  )}
                </CardHeader>
                <CardFooter className="flex justify-between p-3 pt-0">
                  <div className="flex items-center gap-2">
                    {fileId && (
                      <Button
                        variant={fileTags?.some((t: FileTag) => t.id === tag.id) ? "destructive" : "secondary"}
                        size="sm"
                        onClick={() => handleToggleTagOnFile(tag)}
                        className="text-xs h-8 px-2"
                      >
                        {fileTags?.some((t: FileTag) => t.id === tag.id) ? "Remove" : "Add"}
                      </Button>
                    )}
                  </div>
                  {showAddButton && (
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditTag(tag)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit tag</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteTag(tag)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete tag</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </CardFooter>
              </Card>
            ))
          ) : searchQuery || selectedCategory ? (
            <div className="col-span-3 text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg border border-dashed flex flex-col items-center justify-center gap-2">
              <Filter className="h-8 w-8 text-muted-foreground/50" />
              <p>No tags match your filters</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="col-span-3 text-sm text-muted-foreground">No tags found. Create your first tag with the "New Tag" button.</div>
          )}
        </div>
      </div>

      {/* Edit tag dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>
              Make changes to the tag properties.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateTag}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Name</Label>
                <Input 
                  id="edit-name" 
                  value={tagForm.name} 
                  onChange={(e) => setTagForm({...tagForm, name: e.target.value})}
                  className="col-span-3" 
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-emoji" className="text-right">Emoji</Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Input 
                    id="edit-emoji" 
                    value={tagForm.emoji} 
                    onChange={(e) => setTagForm({...tagForm, emoji: e.target.value})}
                    className="flex-1" 
                    required
                    placeholder="📄, 🔥, ⭐, etc."
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        className="h-10 w-10"
                      >
                        <SmilePlus className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="end">
                      <div className="p-3">
                        <div className="font-medium text-sm mb-2">Common Emojis</div>
                        <Tabs defaultValue="Priority">
                          <TabsList className="grid grid-cols-3 mb-2">
                            <TabsTrigger value="Priority">Priority</TabsTrigger>
                            <TabsTrigger value="Status">Status</TabsTrigger>
                            <TabsTrigger value="Type">Type</TabsTrigger>
                          </TabsList>
                          {Object.entries(commonEmojis).map(([category, emojiList]) => (
                            <TabsContent key={category} value={category} className="mt-0">
                              <div className="grid grid-cols-6 gap-2">
                                {emojiList.map(emoji => (
                                  <Button
                                    key={emoji}
                                    type="button"
                                    variant="outline"
                                    className="h-10 w-10 p-0 text-lg"
                                    onClick={() => handleEmojiSelect(emoji)}
                                  >
                                    {emoji}
                                  </Button>
                                ))}
                              </div>
                            </TabsContent>
                          ))}
                        </Tabs>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-color" className="text-right">Color</Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Input 
                    id="edit-color" 
                    type="color" 
                    value={tagForm.color} 
                    onChange={(e) => setTagForm({...tagForm, color: e.target.value})}
                    className="w-12 h-8 p-0 cursor-pointer" 
                  />
                  <Input 
                    value={tagForm.color} 
                    onChange={(e) => setTagForm({...tagForm, color: e.target.value})}
                    className="flex-1" 
                    placeholder="#000000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">Description</Label>
                <Input 
                  id="edit-description" 
                  value={tagForm.description} 
                  onChange={(e) => setTagForm({...tagForm, description: e.target.value})}
                  className="col-span-3" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedTag(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateTagMutation.isPending}>Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}



export { FileTags };