import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
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
import { Pencil, Trash2, Tag, Plus } from 'lucide-react';

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

export function FileTags({ fileId, showAddButton = true, onTagsChanged }: FileTagsProps) {
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
  const { data: allTags, isLoading: isLoadingAllTags } = useQuery({
    queryKey: ['/api/tags'],
    queryFn: async () => {
      const response = await apiRequest('/api/tags');
      return response.data || [];
    }
  });

  // Fetch tags for this file if fileId is provided
  const { 
    data: fileTags, 
    isLoading: isLoadingFileTags 
  } = useQuery({
    queryKey: ['/api/tags/file', fileId],
    queryFn: async () => {
      if (!fileId) return [];
      const response = await apiRequest(`/api/tags/file/${fileId}`);
      return response.data || [];
    },
    enabled: !!fileId
  });

  // Create a new tag
  const createTagMutation = useMutation({
    mutationFn: async (newTag: Omit<FileTag, 'id' | 'createdAt'>) => {
      return await apiRequest('/api/tags', {
        method: 'POST',
        data: newTag
      });
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
      return await apiRequest(`/api/tags/${id}`, {
        method: 'PATCH',
        data: tag
      });
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
      return await apiRequest(`/api/tags/${id}`, {
        method: 'DELETE'
      });
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
      return await apiRequest('/api/tags/map', {
        method: 'POST',
        data: { fileId, tagId }
      });
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
      return await apiRequest(`/api/tags/map/${fileId}/${tagId}`, {
        method: 'DELETE'
      });
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

    const isTaggedAlready = fileTags?.some(t => t.id === tag.id);
    
    if (isTaggedAlready) {
      removeTagFromFileMutation.mutate({ fileId, tagId: tag.id });
    } else {
      addTagToFileMutation.mutate({ fileId, tagId: tag.id });
    }
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
                      <Input 
                        id="emoji" 
                        value={tagForm.emoji} 
                        onChange={(e) => setTagForm({...tagForm, emoji: e.target.value})}
                        className="col-span-3" 
                        required
                        placeholder="📄, 🔥, ⭐, etc."
                      />
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
          ) : allTags && allTags.length > 0 ? (
            allTags.map(tag => (
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
                        variant={fileTags?.some(t => t.id === tag.id) ? "destructive" : "secondary"}
                        size="sm"
                        onClick={() => handleToggleTagOnFile(tag)}
                        className="text-xs h-8 px-2"
                      >
                        {fileTags?.some(t => t.id === tag.id) ? "Remove" : "Add"}
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
          ) : (
            <div className="text-sm text-muted-foreground">No tags found</div>
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
                <Input 
                  id="edit-emoji" 
                  value={tagForm.emoji} 
                  onChange={(e) => setTagForm({...tagForm, emoji: e.target.value})}
                  className="col-span-3" 
                  required
                  placeholder="📄, 🔥, ⭐, etc."
                />
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

// Helper function to determine if a color is dark (to set text color accordingly)
function isDarkColor(hexColor: string): boolean {
  // Remove # if present
  hexColor = hexColor.replace('#', '');
  
  // Parse the color
  const r = parseInt(hexColor.substr(0, 2), 16);
  const g = parseInt(hexColor.substr(2, 2), 16);
  const b = parseInt(hexColor.substr(4, 2), 16);
  
  // Calculate brightness (YIQ equation)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Return true if color is dark
  return brightness < 128;
}

export default FileTags;