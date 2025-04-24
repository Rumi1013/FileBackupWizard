import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DirectoryTree } from "./DirectoryTree";
import { LogViewer } from "./LogViewer";
import { FileAssessment } from "./FileAssessment";
import { ExternalServices } from "./ExternalServices";
import StorageSelector from "./StorageSelector";
import { FileTags } from "./FileTags";
import TagPresetManager from "./TagPresetManager";
import BatchTagOrganizer from "./BatchTagOrganizer";
import TagSearch from "./TagSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Folder, 
  RefreshCw, 
  ChevronRight, 
  AlertCircle, 
  Home,
  Upload,
  FileText,
  Trash,
  Trash2,
  FolderPlus,
  ClipboardList,
  Filter,
  Sparkles,
  Award,
  AlertTriangle,
  Clock,
  MoveRight,
  BarChart4,
  BrainCircuit,
  Link,
  CloudIcon,
  DownloadCloud,
  ExternalLink,
  Tag,
  Boxes,
  FileWarning
} from "lucide-react";
import type { DirectoryEntry, DailyReport, FileAssessment as FileAssessmentType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { FileUploader } from "./FileUploader";

export function FileManager() {
  const [currentPath, setCurrentPath] = useState("/");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [organizationView, setOrganizationView] = useState<'all' | 'high-quality' | 'monetizable' | 'delete-candidates'>('all');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedDirectories, setSelectedDirectories] = useState<Set<string>>(new Set());
  const [storageProvider, setStorageProvider] = useState<'local' | 'dropbox' | 'google-drive' | 'github' | 'cloudflare' | 'mm-storage' | 
    'home-dir' | 'downloads-dir' | 'documents-dir' | 'pictures-dir' | 'workspace-dir' | 'custom'>('local');
  const { toast } = useToast();
  
  // Common error handler for mutations
  const handleMutationError = (error: any) => {
    toast({
      title: "Error",
      description: String(error),
      variant: "destructive",
    });
  };

  // Query for directory data
  const { data: directoryData, isLoading, error, refetch } = useQuery<DirectoryEntry>({
    queryKey: ['/api/files/scan', currentPath],
    queryFn: async () => {
      const response = await fetch(`/api/files/scan?path=${encodeURIComponent(currentPath)}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to scan directory');
      }
      return response.json();
    }
  });

  // Query for daily report data
  const { data: dailyReport } = useQuery<DailyReport>({
    queryKey: ['/api/reports/daily'],
    queryFn: async () => {
      const response = await fetch('/api/reports/daily');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch daily report');
      }
      return response.json();
    }
  });

  // Mutation for scanning directory
  const scanMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/operations', {
        sourcePath: currentPath,
        operationType: 'scan',
        status: 'started'
      });
      return refetch();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Directory scan completed",
      });
    },
    onError: handleMutationError,
  });

  // Mutation for creating a new folder
  const createFolderMutation = useMutation({
    mutationFn: async (folderName: string) => {
      const newPath = `${currentPath}/${folderName}`.replace(/\/\/+/g, '/');
      return apiRequest('POST', '/api/directory', { path: newPath });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "New folder created",
      });
      refetch();
    },
    onError: handleMutationError,
  });

  // Mutation for organizing files
  const organizeMutation = useMutation({
    mutationFn: async (filePath: string) => {
      return apiRequest('POST', '/api/organize', { filePath });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "File organization rules applied",
      });
      refetch();
    },
    onError: handleMutationError,
  });

  // Mutation for batch organizing files
  const batchOrganizeMutation = useMutation({
    mutationFn: async (filePaths: string[]) => {
      return apiRequest('POST', '/api/organize-batch', { filePaths });
    },
    onSuccess: (data) => {
      toast({
        title: "Batch Organization Complete",
        description: `Processed ${data.processed} files (${data.failed} failed)`,
      });
      refetch();
    },
    onError: handleMutationError,
  });

  // Mutation for batch scanning directories
  const batchScanMutation = useMutation({
    mutationFn: async (dirPaths: string[]) => {
      return apiRequest('POST', '/api/files/scan-batch', { dirPaths });
    },
    onSuccess: (data) => {
      toast({
        title: "Batch Scan Complete",
        description: `Scanned ${data.scannedCount} directories successfully`,
      });

      // Reset selected directories after scan
      setSelectedDirectories(new Set());
      setIsBatchMode(false);

      // Refresh the current view
      refetch();
    },
    onError: handleMutationError,
  });

  // Mutation for analyzing a file
  const analyzeMutation = useMutation({
    mutationFn: async (filePath: string) => {
      return apiRequest('POST', '/api/assess', { filePath });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "File analyzed successfully",
      });
      refetch();
    },
    onError: handleMutationError,
  });

  // Handle file selection
  const handleFileSelect = (path: string) => {
    setSelectedFile(path);
  };

  // Handle upload completion
  const handleUploadComplete = () => {
    refetch();
  };

  // Handle path change
  const handlePathChange = (newPath: string) => {
    setCurrentPath(newPath);
  };

  // Go to root directory
  const goToRoot = () => {
    setCurrentPath("/");
  };

  // Handle storage selection
  const handleStorageSelect = (path: string, provider: 'local' | 'dropbox' | 'google-drive' | 'github' | 'cloudflare' | 'mm-storage' | 
    'home-dir' | 'downloads-dir' | 'documents-dir' | 'pictures-dir' | 'workspace-dir' | 'custom') => {
    setCurrentPath(path);
    setStorageProvider(provider);

    // You could add additional logic here based on the storage provider
    // For example, setting up authentication or showing provider-specific options

    if (provider !== 'local' && provider !== 'mm-storage') {
      let serviceName = "";
      switch(provider) {
        case 'dropbox':
          serviceName = "Dropbox";
          break;
        case 'google-drive':
          serviceName = "Google Drive";
          break;
        case 'github':
          serviceName = "GitHub";
          break;
        case 'cloudflare':
          serviceName = "Cloudflare";
          break;
        default:
          serviceName = "Service";
      }

      toast({
        title: "External Storage",
        description: `${serviceName} connection will be available in the next update.`,
        variant: "default",
      });
    }
  };

  // Handle creation of a new folder
  const handleCreateFolder = () => {
    const folderName = prompt("Enter folder name:");
    if (folderName) {
      createFolderMutation.mutate(folderName);
    }
  };

  // Handle organizing a file
  const handleOrganizeFile = () => {
    if (selectedFile) {
      organizeMutation.mutate(selectedFile);
    }
  };

  // Handle analyzing a file
  const handleAnalyzeFile = () => {
    if (selectedFile) {
      analyzeMutation.mutate(selectedFile);
    }
  };

  // Toggle batch mode for multi-directory selection
  const toggleBatchMode = () => {
    setIsBatchMode(!isBatchMode);
    // Clear selections when toggling
    if (isBatchMode) {
      setSelectedDirectories(new Set());
    }
  };

  // Handle batch directory scanning
  const handleBatchScan = () => {
    if (selectedDirectories.size === 0) {
      toast({
        title: "No Directories Selected",
        description: "Please select at least one directory for batch scanning",
        variant: "destructive"
      });
      return;
    }

    const dirPaths = Array.from(selectedDirectories);
    if (confirm(`Scan ${dirPaths.length} selected ${dirPaths.length === 1 ? 'directory' : 'directories'}?`)) {
      batchScanMutation.mutate(dirPaths);
    }
  };

  // Breadcrumbs array
  const breadcrumbs = currentPath.split('/').filter(Boolean);

  // Function to get file statistics
  const getFileStats = () => {
    if (!directoryData) return { total: 0, highQuality: 0, monetizable: 0, forDeletion: 0 };

    let total = 0;
    let highQuality = 0;
    let monetizable = 0;
    let forDeletion = 0;

    const countFiles = (entry: DirectoryEntry) => {
      if (entry.type === 'file') {
        total++;
        if (entry.assessment) {
          if (entry.assessment.qualityScore === 'Good') highQuality++;
          if (entry.assessment.monetizationEligible) monetizable++;
          if (entry.assessment.needsDeletion) forDeletion++;
        }
      }
      if (entry.children) {
        entry.children.forEach(countFiles);
      }
    };

    countFiles(directoryData);
    return { total, highQuality, monetizable, forDeletion };
  };

  // Filter functions for different views
  const filterHighQualityFiles = (entry: DirectoryEntry): DirectoryEntry[] => {
    if (entry.type === 'file') {
      if (entry.assessment?.qualityScore === 'Good') {
        return [entry];
      }
      return [];
    }

    if (!entry.children) return [];

    const filteredChildren: DirectoryEntry[] = [];

    for (const child of entry.children) {
      if (child.type === 'file') {
        if (child.assessment?.qualityScore === 'Good') {
          filteredChildren.push(child);
        }
      } else {
        const nestedFilteredChildren = filterHighQualityFiles(child);
        if (nestedFilteredChildren.length > 0) {
          filteredChildren.push({
            ...child,
            children: nestedFilteredChildren
          });
        }
      }
    }

    return filteredChildren;
  };

  const filterMonetizableFiles = (entry: DirectoryEntry): DirectoryEntry[] => {
    if (entry.type === 'file') {
      if (entry.assessment?.monetizationEligible) {
        return [entry];
      }
      return [];
    }

    if (!entry.children) return [];

    const filteredChildren: DirectoryEntry[] = [];

    for (const child of entry.children) {
      if (child.type === 'file') {
        if (child.assessment?.monetizationEligible) {
          filteredChildren.push(child);
        }
      } else {
        const nestedFilteredChildren = filterMonetizableFiles(child);
        if (nestedFilteredChildren.length > 0) {
          filteredChildren.push({
            ...child,
            children: nestedFilteredChildren
          });
        }
      }
    }

    return filteredChildren;
  };

  const filterDeletionCandidates = (entry: DirectoryEntry): DirectoryEntry[] => {
    if (entry.type === 'file') {
      if (entry.assessment?.needsDeletion) {
        return [entry];
      }
      return [];
    }

    if (!entry.children) return [];

    const filteredChildren: DirectoryEntry[] = [];

    for (const child of entry.children) {
      if (child.type === 'file') {
        if (child.assessment?.needsDeletion) {
          filteredChildren.push(child);
        }
      } else {
        const nestedFilteredChildren = filterDeletionCandidates(child);
        if (nestedFilteredChildren.length > 0) {
          filteredChildren.push({
            ...child,
            children: nestedFilteredChildren
          });
        }
      }
    }

    return filteredChildren;
  };

  // Handle batch organization of all files in a particular category
  const handleBatchOrganize = (category: 'high-quality' | 'monetizable' | 'deletion') => {
    if (!directoryData) return;

    // Determine which filter to use based on category
    let filterFunction: (entry: DirectoryEntry) => DirectoryEntry[];

    switch (category) {
      case 'high-quality':
        filterFunction = filterHighQualityFiles;
        break;
      case 'monetizable':
        filterFunction = filterMonetizableFiles;
        break;
      case 'deletion':
        filterFunction = filterDeletionCandidates;
        break;
    }

    // Extract file paths
    const filePaths: string[] = [];
    const extractFilePaths = (entries: DirectoryEntry[]) => {
      for (const entry of entries) {
        if (entry.type === 'file') {
          filePaths.push(entry.path);
        }
        if (entry.children && entry.children.length > 0) {
          extractFilePaths(entry.children);
        }
      }
    };

    // Apply the filter and extract file paths
    const filteredData = filterFunction(directoryData);
    extractFilePaths(filteredData);

    if (filePaths.length === 0) {
      toast({
        title: "No Files Found",
        description: `No files match the ${category} criteria for batch organization.`,
        variant: "default"
      });
      return;
    }

    // Confirm and process
    if (confirm(`Process ${filePaths.length} ${category} files?`)) {
      batchOrganizeMutation.mutate(filePaths);
    }
  };

  // Get file statistics
  const stats = getFileStats();

  return (
    <div className="space-y-4">
      {/* Top Navigation Bar */}
      <Card className="border-b shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            {/* Left side: Location controls */}
            <div className="flex flex-col gap-2 flex-grow">
              <div className="flex items-center gap-2">
                <StorageSelector
                  onStorageSelect={handleStorageSelect}
                  currentPath={currentPath}
                />
                
                <Button 
                  onClick={() => scanMutation.mutate()}
                  disabled={scanMutation.isPending}
                  size="icon"
                  variant="outline"
                  title="Refresh current directory"
                >
                  <RefreshCw className={`h-4 w-4 ${scanMutation.isPending ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              {/* Simple breadcrumb path */}
              <div className="flex items-center overflow-x-auto gap-1 text-sm px-2 py-1 bg-muted/20 rounded-md">
                <Button 
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={goToRoot}
                  title="Go to Root"
                >
                  <Home className="h-3.5 w-3.5" />
                </Button>
                <span className="text-muted-foreground">/</span>
                {breadcrumbs.map((segment, index) => {
                  const path = '/' + breadcrumbs.slice(0, index + 1).join('/');
                  return (
                    <div key={path} className="flex items-center">
                      <Button 
                        variant="ghost" 
                        className="h-6 px-2 text-xs font-medium"
                        onClick={() => handlePathChange(path)}
                      >
                        {segment}
                      </Button>
                      {index < breadcrumbs.length - 1 && (
                        <span className="text-muted-foreground">/</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Right side: Quick actions */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => {
                  // Create an input element
                  const input = document.createElement('input');
                  input.type = 'file';
                  
                  // Set up the change handler
                  input.onchange = (e) => {
                    const target = e.target as HTMLInputElement;
                    if (target.files && target.files[0]) {
                      const formData = new FormData();
                      formData.append('file', target.files[0]);
                      
                      // Process the directory path
                      let processedPath = currentPath;
                      if (currentPath.includes('~/Downloads') || currentPath === 'downloads-dir') {
                        processedPath = 'downloads';
                      } else if (currentPath.includes('~/Documents') || currentPath === 'documents-dir') {
                        processedPath = 'documents';
                      } else if (currentPath.includes('~/Pictures') || currentPath === 'pictures-dir') {
                        processedPath = 'pictures';
                      } else if (currentPath === 'home-dir') {
                        processedPath = '~';
                      } else if (currentPath === 'workspace-dir') {
                        processedPath = '/workspace';
                      }
                      
                      formData.append('directory', processedPath);
                      console.log('Uploading to directory:', processedPath);
                      
                      fetch('/api/upload', {
                        method: 'POST',
                        body: formData,
                      })
                      .then(response => {
                        if (!response.ok) {
                          throw new Error('Upload failed');
                        }
                        return response.json();
                      })
                      .then(() => {
                        toast({
                          title: "Success",
                          description: "File uploaded successfully",
                        });
                        refetch();
                      })
                      .catch(error => {
                        toast({
                          title: "Upload Failed",
                          description: String(error),
                          variant: "destructive",
                        });
                      });
                    }
                  };
                  
                  // Trigger the file selection dialog
                  input.click();
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleCreateFolder}
                size="sm"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
            </div>
          </div>
          
          {/* Progress indicator */}
          {(isLoading || scanMutation.isPending) && (
            <Progress value={30} className="w-full mt-2" />
          )}
          
          {/* Error message if present */}
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-2 mt-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <p className="text-xs">{String(error)}</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Main content with tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left panel: File browser (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* File Browser Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid grid-cols-4 mb-2">
              <TabsTrigger value="all" onClick={() => setOrganizationView('all')}>
                <Folder className="mr-2 h-4 w-4" />
                All Files
              </TabsTrigger>
              <TabsTrigger value="high-quality" onClick={() => setOrganizationView('high-quality')}>
                <Award className="mr-2 h-4 w-4" />
                High Quality
              </TabsTrigger>
              <TabsTrigger value="monetizable" onClick={() => setOrganizationView('monetizable')}>
                <Sparkles className="mr-2 h-4 w-4" />
                Monetizable
              </TabsTrigger>
              <TabsTrigger value="tag-search">
                <Tag className="mr-2 h-4 w-4" />
                Tag Search
              </TabsTrigger>
            </TabsList>
            
            {/* Batch Action Bar - appears when in batch mode */}
            {isBatchMode && (
              <div className="bg-muted/30 rounded-md p-2 mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs">
                    {selectedDirectories.size} {selectedDirectories.size === 1 ? 'item' : 'items'} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleBatchScan}
                    disabled={selectedDirectories.size === 0}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Process Selected
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={toggleBatchMode}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            
            {/* File browser content for different tabs */}
            <TabsContent value="all" className="mt-0">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <Folder className="h-4 w-4 text-primary" /> 
                      File Browser
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleBatchMode}
                      className="h-7 text-xs"
                    >
                      {isBatchMode ? "Exit Batch Mode" : "Enter Batch Mode"}
                    </Button>
                  </div>
                  
                  {directoryData ? (
                    <DirectoryTree 
                      data={directoryData} 
                      onSelect={handleFileSelect}
                      currentPath={currentPath}
                      selectedFile={selectedFile}
                      multiSelect={isBatchMode}
                      selectedDirs={selectedDirectories}
                      onMultiSelectChange={setSelectedDirectories}
                      isProcessingBatch={batchScanMutation.isPending}
                    />
                  ) : !isLoading && !error && (
                    <div className="text-center py-8 text-muted-foreground">
                      No directory data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="high-quality" className="mt-0">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <Award className="h-4 w-4 text-green-500" /> 
                      High Quality Files
                    </div>
                    <Button 
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleBatchOrganize('high-quality')}
                      disabled={!directoryData}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Process All
                    </Button>
                  </div>
                  
                  {directoryData && filterHighQualityFiles(directoryData).length > 0 ? (
                    <DirectoryTree 
                      data={{ ...directoryData, children: filterHighQualityFiles(directoryData) }} 
                      onSelect={handleFileSelect}
                      currentPath={currentPath}
                      selectedFile={selectedFile}
                    />
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No high quality files found
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="monetizable" className="mt-0">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" /> 
                      Monetizable Files
                    </div>
                    <Button 
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleBatchOrganize('monetizable')}
                      disabled={!directoryData}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Process All
                    </Button>
                  </div>
                  
                  {directoryData && filterMonetizableFiles(directoryData).length > 0 ? (
                    <DirectoryTree 
                      data={{ ...directoryData, children: filterMonetizableFiles(directoryData) }} 
                      onSelect={handleFileSelect}
                      currentPath={currentPath}
                      selectedFile={selectedFile}
                    />
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No monetizable files found
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="tag-search" className="mt-0">
              <Card>
                <CardContent className="p-4">
                  <TagSearch />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* File uploader component (hidden input) */}
          <FileUploader 
            currentDirectory={currentPath}
            onUploadComplete={handleUploadComplete}
          />
        </div>
        
        {/* Right panel: File details, stats and tags (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* File Statistics Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart4 className="h-4 w-4 text-primary" />
                File Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-md p-2 text-center">
                  <div className="text-xs text-muted-foreground">Total Files</div>
                  <div className="text-xl font-bold">{stats.total}</div>
                </div>
                <div className="bg-muted/30 rounded-md p-2 text-center">
                  <div className="text-xs text-muted-foreground">High Quality</div>
                  <div className="text-xl font-bold text-green-500">{stats.highQuality}</div>
                </div>
                <div className="bg-muted/30 rounded-md p-2 text-center">
                  <div className="text-xs text-muted-foreground">Monetizable</div>
                  <div className="text-xl font-bold text-amber-500">{stats.monetizable}</div>
                </div>
                <div className="bg-muted/30 rounded-md p-2 text-center">
                  <div className="text-xs text-muted-foreground">For Deletion</div>
                  <div className="text-xl font-bold text-destructive">{stats.forDeletion}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Selected File Preview/Details */}
          {selectedFile && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Selected File
                </CardTitle>
                <CardDescription className="truncate text-xs">
                  {selectedFile}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between gap-2">
                    <Button size="sm" variant="outline" className="w-full" onClick={handleAnalyzeFile}>
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      Analyze
                    </Button>
                    <Button size="sm" variant="outline" className="w-full" onClick={handleOrganizeFile}>
                      <MoveRight className="h-3.5 w-3.5 mr-1" />
                      Organize
                    </Button>
                  </div>
                  
                  {/* File Preview Component */}
                  <div className="border rounded-md h-[250px] overflow-auto">
                    {/* Add File Preview component here with the selectedFile */}
                    <div className="p-4 flex items-center justify-center h-full text-muted-foreground text-sm">
                      File preview will be displayed here
                    </div>
                  </div>
                  
                  {/* File Tags Component */}
                  <div className="mt-3 border rounded-md p-3">
                    <div className="text-sm font-medium mb-2 flex items-center">
                      <Tag className="h-3.5 w-3.5 mr-1.5 text-primary" />
                      File Tags
                    </div>
                    <FileTags 
                      fileId={selectedFile} 
                      showAddButton={true}
                      onTagsChanged={() => refetch()}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Tag Management Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                Tags & Organization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Tabs defaultValue="manage">
                  <TabsList className="grid grid-cols-3 mb-2">
                    <TabsTrigger value="manage">
                      <Tag className="h-3.5 w-3.5 mr-1" />
                      Manage
                    </TabsTrigger>
                    <TabsTrigger value="suggestions">
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      AI Suggest
                    </TabsTrigger>
                    <TabsTrigger value="batch">
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      Batch
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="manage" className="space-y-4 mt-2">
                    <div className="text-xs text-muted-foreground">
                      Manage your tag library with emoji-based organization
                    </div>
                    <FileTags 
                      showAddButton={true}
                    />
                  </TabsContent>
                  
                  <TabsContent value="suggestions" className="space-y-4 mt-2">
                    <div className="text-xs text-muted-foreground">
                      Get AI-powered tag suggestions based on file content
                    </div>
                    <Button size="sm" className="w-full" variant="outline" disabled={!selectedFile}>
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      Get AI Tag Suggestions
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="batch" className="space-y-4 mt-2">
                    <div className="text-xs text-muted-foreground">
                      Process tags in batches for multiple files
                    </div>
                    <div className="space-y-2">
                      <Button 
                        size="sm" 
                        className="w-full" 
                        variant="outline"
                        onClick={() => toggleBatchMode()}
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        {isBatchMode ? "Exit Batch Mode" : "Enter Batch Mode"}
                      </Button>
                      
                      <BatchTagOrganizer 
                        filePaths={Array.from(selectedDirectories)}
                        onComplete={() => {
                          refetch();
                          setSelectedDirectories(new Set());
                          setIsBatchMode(false);
                        }}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}