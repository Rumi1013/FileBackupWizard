import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { PresetTag } from '@shared/tag-presets';

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
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

// Icons
import { Search, Tag, FileText, Download, FileSpreadsheet, Filter, X, Clock, Plus } from 'lucide-react';

// Interface for file tag mapping
interface FileTagMapping {
  fileId: string;
  tagId: string;
  filePath?: string;
  fileName?: string;
  tag?: {
    id: string;
    name: string;
    emoji: string;
    color: string;
    description?: string;
  };
}

// Interface for tag type
interface Tag {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description?: string;
}

// Interface for file with tags
interface FileWithTags {
  filePath: string;
  fileName: string;
  tags: Tag[];
}

// Interface for exported data format
interface ExportData {
  fileName: string;
  filePath: string;
  tags: string; // Comma-separated tag names with emojis
  tagCategories: string; // Categories inferred from tags
  dateTagged: string;
}

// Helper to determine text color based on background color
const getTextColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5 ? 'white' : 'black';
};

// Helper to categorize tags based on naming patterns
const categorizeTag = (tag: Tag): string => {
  const name = tag.name.toLowerCase();
  const emoji = tag.emoji;
  
  // This is a simplified categorization system - can be expanded based on your specific tags
  if (emoji === '⭐' || emoji === '📌' || name.includes('priority')) return 'Priority';
  if (emoji === '✅' || emoji === '⏳' || name.includes('status')) return 'Status';
  if (emoji === '📊' || emoji === '📄' || emoji === '🎥') return 'Content Type';
  if (emoji === '🏢' || emoji === '🏠') return 'Project';
  if (emoji === '💰' || emoji === '📈') return 'Monetization';
  if (emoji === '🔍' || emoji === '📝') return 'Action';
  if (emoji === '📝' || emoji === '🌟' || emoji === '🔄') return 'Content Status';
  if (emoji === '💰' || emoji === '📈' || emoji === '🧲' || emoji === '🏛️' || emoji === '🎁') return 'Monetization';
  if (emoji === '⚡' || emoji === '🏆' || emoji === '🧠' || emoji === '⏰' || emoji === '🌊') return 'ADHD-Friendly';
  if (emoji === '🗓️' || emoji === '🤝' || emoji === '🏢' || emoji === '📣' || emoji === '💵') return 'Event Planning';
  if (emoji === '🎨' || emoji === '🔤' || emoji === '🎭' || emoji === '📋' || emoji === '📘') return 'Brand Asset';
  
  return 'Other';
};

// Convert file data to CSV format
const convertToCSV = (data: ExportData[]): string => {
  const header = ['File Name', 'File Path', 'Tags', 'Categories', 'Date Tagged'];
  const rows = data.map(item => [
    item.fileName,
    item.filePath,
    item.tags,
    item.tagCategories,
    item.dateTagged
  ]);
  
  return [
    header.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
};

// Export data to CSV file
const exportCSV = (data: ExportData[]): void => {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `midnight_magnolia_tag_export_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Convert file data to JSON format
const prepareJSON = (data: ExportData[]): string => {
  return JSON.stringify(data, null, 2);
};

// Export data to JSON file
const exportJSON = (data: ExportData[]): void => {
  const json = prepareJSON(data);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `midnight_magnolia_tag_export_${new Date().toISOString().slice(0, 10)}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Main component
export default function TagSearch() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'google-sheets'>('csv');
  const [filteredFiles, setFilteredFiles] = useState<FileWithTags[]>([]);
  
  // Fetch all tags
  const { data: tags, isLoading: isTagsLoading } = useQuery<Tag[]>({
    queryKey: ['/api/tags'],
    queryFn: async () => {
      const response = await fetch('/api/tags');
      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }
      return response.json();
    }
  });
  
  // Fetch file-tag mappings
  const { data: fileTags, isLoading: isFileTagsLoading } = useQuery<FileTagMapping[]>({
    queryKey: ['/api/tags/mappings'],
    queryFn: async () => {
      const response = await fetch('/api/tags/mappings');
      if (!response.ok) {
        throw new Error('Failed to fetch file tag mappings');
      }
      return response.json();
    }
  });
  
  // Process file-tag mappings to create a list of files with their tags
  useEffect(() => {
    if (!fileTags || !tags) return;
    
    // Create a map of fileId to file and its tags
    const fileMap = new Map<string, FileWithTags>();
    
    fileTags.forEach(mapping => {
      if (!mapping.filePath) return;
      
      const fileId = mapping.fileId;
      const fileName = mapping.filePath.split('/').pop() || mapping.filePath;
      const tag = tags.find(t => t.id === mapping.tagId);
      
      if (!tag) return;
      
      if (!fileMap.has(fileId)) {
        fileMap.set(fileId, {
          filePath: mapping.filePath,
          fileName,
          tags: [tag]
        });
      } else {
        const file = fileMap.get(fileId)!;
        file.tags.push(tag);
        fileMap.set(fileId, file);
      }
    });
    
    // Convert the map to an array of files with tags
    let files = Array.from(fileMap.values());
    
    // Filter based on search query and selected tags
    if (searchQuery || selectedTags.length > 0) {
      files = files.filter(file => {
        // Filter by file name
        const matchesQuery = searchQuery 
          ? file.fileName.toLowerCase().includes(searchQuery.toLowerCase())
          : true;
        
        // Filter by selected tags
        const matchesTags = selectedTags.length > 0
          ? selectedTags.every(tagId => file.tags.some(tag => tag.id === tagId))
          : true;
        
        return matchesQuery && matchesTags;
      });
    }
    
    setFilteredFiles(files);
  }, [fileTags, tags, searchQuery, selectedTags]);
  
  // Toggle tag selection
  const toggleTagSelection = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };
  
  // Prepare data for export
  const prepareExportData = (): ExportData[] => {
    return filteredFiles.map(file => {
      // Get tag names with emojis
      const tagString = file.tags.map(tag => `${tag.emoji} ${tag.name}`).join(', ');
      
      // Get categories based on tags
      const categories = Array.from(new Set(file.tags.map(categorizeTag))).join(', ');
      
      return {
        fileName: file.fileName,
        filePath: file.filePath,
        tags: tagString,
        tagCategories: categories,
        dateTagged: new Date().toISOString().slice(0, 10) // Using current date as placeholder
      };
    });
  };
  
  // Handle export click
  const handleExport = () => {
    const exportData = prepareExportData();
    
    if (exportData.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no files matching your current filters",
        variant: "destructive"
      });
      return;
    }
    
    if (exportFormat === 'csv') {
      exportCSV(exportData);
      toast({
        title: "Export Complete",
        description: `Exported ${exportData.length} files to CSV format`
      });
    } else if (exportFormat === 'json') {
      exportJSON(exportData);
      toast({
        title: "Export Complete",
        description: `Exported ${exportData.length} files to JSON format`
      });
    } else if (exportFormat === 'google-sheets') {
      toast({
        title: "Google Sheets Integration",
        description: "Google Sheets direct export will be available in the next update. Data has been exported as CSV which can be imported into Google Sheets."
      });
      exportCSV(exportData);
    }
    
    setExportDialogOpen(false);
  };
  
  // Handle file click (placeholder for future functionality)
  const handleFileClick = (file: FileWithTags) => {
    // This could navigate to the file or open a preview
    toast({
      title: "File Selected",
      description: `Selected ${file.fileName}`
    });
  };
  
  return (
    <div className="space-y-4">
      {/* Search and filter controls */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-7 w-7 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
        
        {/* Tag filter section */}
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedTags.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="h-7 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" /> Clear filters
            </Button>
          )}
          
          {tags && tags.map(tag => (
            <Badge
              key={tag.id}
              style={{ 
                backgroundColor: selectedTags.includes(tag.id) ? tag.color : 'transparent', 
                color: selectedTags.includes(tag.id) ? getTextColor(tag.color) : 'inherit',
                borderColor: tag.color,
                border: '1px solid'
              }}
              className="cursor-pointer h-7"
              onClick={() => toggleTagSelection(tag.id)}
            >
              <span className="flex items-center">
                {tag.emoji} {tag.name}
              </span>
            </Badge>
          ))}
        </div>
      </div>
      
      {/* Results section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-medium">
              {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''} found
            </div>
          </div>
          
          {isTagsLoading || isFileTagsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading files and tags...
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No files match your search criteria
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredFiles.map((file, index) => (
                  <div 
                    key={index} 
                    className="p-3 border rounded-md hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => handleFileClick(file)}
                  >
                    <div className="flex items-center mb-1">
                      <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium">{file.fileName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2 font-mono truncate">
                      {file.filePath}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {file.tags.map((tag, tagIndex) => (
                        <Badge
                          key={tagIndex}
                          style={{ 
                            backgroundColor: tag.color,
                            color: getTextColor(tag.color)
                          }}
                          className="text-xs h-5"
                        >
                          {tag.emoji} {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      
      {/* Export dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Tagged Files</DialogTitle>
            <DialogDescription>
              Export your tagged files data for use in spreadsheets and other applications.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="export-format">Export Format</Label>
              <Select 
                value={exportFormat} 
                onValueChange={(value) => setExportFormat(value as 'csv' | 'json' | 'google-sheets')}
              >
                <SelectTrigger id="export-format">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <div className="flex items-center">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      CSV (Excel, Numbers)
                    </div>
                  </SelectItem>
                  <SelectItem value="json">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      JSON
                    </div>
                  </SelectItem>
                  <SelectItem value="google-sheets">
                    <div className="flex items-center">
                      <img 
                        src="https://www.gstatic.com/images/branding/product/1x/sheets_48dp.png" 
                        alt="Google Sheets" 
                        className="h-4 w-4 mr-2" 
                      />
                      Google Sheets
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Export Summary</Label>
              <div className="mt-1 p-3 border rounded-md bg-muted/30 text-sm">
                <p>• Exporting {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}</p>
                <p>• Includes file paths, file names, tags, and categories</p>
                <p>• Can be imported into any spreadsheet software</p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}