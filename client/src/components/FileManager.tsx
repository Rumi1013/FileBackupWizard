import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DirectoryTree } from "./DirectoryTree";
import { LogViewer } from "./LogViewer";
import { FileAssessment } from "./FileAssessment";
import { ExternalServices } from "./ExternalServices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
  ExternalLink 
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
  const { toast } = useToast();

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
    onError: (error) => {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      });
    },
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
    onError: (error) => {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      });
    },
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
    onError: (error) => {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      });
    },
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
    onError: (error) => {
      toast({
        title: "Batch Organization Error",
        description: String(error),
        variant: "destructive",
      });
    },
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
    onError: (error) => {
      toast({
        title: "Batch Scan Error",
        description: String(error),
        variant: "destructive",
      });
    },
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
    onError: (error) => {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      });
    },
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
      default:
        return;
    }
    
    // Get filtered files
    const filteredFiles = filterFunction(directoryData);
    
    // Flatten the structure to get all file paths
    const getAllFilePaths = (entries: DirectoryEntry[]): string[] => {
      const paths: string[] = [];
      
      for (const entry of entries) {
        if (entry.type === 'file') {
          paths.push(entry.path);
        } else if (entry.children) {
          paths.push(...getAllFilePaths(entry.children));
        }
      }
      
      return paths;
    };
    
    const filePaths = getAllFilePaths(filteredFiles);
    
    if (filePaths.length === 0) {
      toast({
        title: "No Files Found",
        description: `No ${category.replace('-', ' ')} files found for batch organization`,
      });
      return;
    }
    
    // Confirm with user
    if (confirm(`Apply organization rules to ${filePaths.length} ${category.replace('-', ' ')} files?`)) {
      batchOrganizeMutation.mutate(filePaths);
    }
  };

  // Get file statistics
  const stats = getFileStats();

  return (
    <div className="space-y-6">
      {/* Navigation Panel */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2">
              <Breadcrumb>
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => handlePathChange("/")}>
                    Root
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((segment, index) => {
                  const path = '/' + breadcrumbs.slice(0, index + 1).join('/');
                  return (
                    <BreadcrumbItem key={path}>
                      <ChevronRight className="h-4 w-4" />
                      <BreadcrumbLink onClick={() => handlePathChange(path)}>
                        {segment}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  );
                })}
              </Breadcrumb>
            </div>

            {/* Path Input and Actions */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={goToRoot}
                  className="min-w-[40px] px-3"
                  title="Go to Root Directory"
                >
                  <Home className="h-4 w-4" />
                </Button>
                <Input
                  value={currentPath}
                  onChange={(e) => setCurrentPath(e.target.value)}
                  placeholder="Enter directory path"
                  className="flex-1"
                />
                <Button 
                  onClick={() => scanMutation.mutate()}
                  disabled={scanMutation.isPending || batchScanMutation.isPending}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${scanMutation.isPending ? 'animate-spin' : ''}`} />
                  Scan
                </Button>
              </div>
              
              {/* Batch Mode Controls */}
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <Button
                    variant={isBatchMode ? "default" : "outline"}
                    size="sm"
                    onClick={toggleBatchMode}
                    className="text-xs h-8"
                    disabled={batchScanMutation.isPending}
                  >
                    {isBatchMode ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        Exit Batch Mode
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        Enable Batch Mode
                      </>
                    )}
                  </Button>
                  
                  {isBatchMode && (
                    <span className="text-xs text-muted-foreground">
                      {selectedDirectories.size} {selectedDirectories.size === 1 ? 'directory' : 'directories'} selected
                    </span>
                  )}
                </div>
                
                {isBatchMode && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleBatchScan}
                    disabled={selectedDirectories.size === 0 || batchScanMutation.isPending}
                    className="text-xs h-8"
                  >
                    {batchScanMutation.isPending ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        Scan Selected Directories
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: File Browser & Actions */}
        <div className="space-y-4 lg:col-span-2">
          {/* File Statistics Dashboard */}
          <Card className="bg-muted/40">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart4 className="h-5 w-5" />
                File Statistics & Insights
              </CardTitle>
              <CardDescription>Overview of your files and organization status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-background rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-medium">Total Files</h3>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold mt-2">{stats.total}</p>
                </div>
                
                <div className="bg-background rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-medium">High Quality</h3>
                    <Award className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold mt-2">{stats.highQuality}</p>
                </div>
                
                <div className="bg-background rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-medium">Monetizable</h3>
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold mt-2">{stats.monetizable}</p>
                </div>
                
                <div className="bg-background rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-medium">For Deletion</h3>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <p className="text-2xl font-bold mt-2">{stats.forDeletion}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BrainCircuit className="h-5 w-5" />
                ADHD-Friendly Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center p-4 h-auto hover:bg-primary/5 hover:border-primary transition-colors"
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                >
                  <Upload className="h-8 w-8 mb-2 text-primary" />
                  <span className="text-xs font-medium">Upload File</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center p-4 h-auto hover:bg-primary/5 hover:border-primary transition-colors"
                  onClick={handleCreateFolder}
                >
                  <FolderPlus className="h-8 w-8 mb-2 text-primary" />
                  <span className="text-xs font-medium">New Folder</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center p-4 h-auto hover:bg-primary/5 hover:border-primary transition-colors"
                  disabled={!selectedFile}
                  onClick={handleAnalyzeFile}
                >
                  <FileText className="h-8 w-8 mb-2 text-primary" />
                  <span className="text-xs font-medium">Analyze File</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center p-4 h-auto hover:bg-primary/5 hover:border-primary transition-colors"
                  disabled={!selectedFile}
                  onClick={handleOrganizeFile}
                >
                  <MoveRight className="h-8 w-8 mb-2 text-primary" />
                  <span className="text-xs font-medium">Organize</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center p-4 h-auto hover:bg-primary/5 hover:border-primary transition-colors"
                >
                  <ClipboardList className="h-8 w-8 mb-2 text-primary" />
                  <span className="text-xs font-medium">Daily Report</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center p-4 h-auto text-destructive hover:bg-destructive/5 hover:border-destructive transition-colors" 
                  disabled={!selectedFile}
                >
                  <Trash className="h-8 w-8 mb-2" />
                  <span className="text-xs font-medium">Delete</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Hidden file uploader - triggered by the Upload button */}
          <div className="hidden">
            <FileUploader 
              currentDirectory={currentPath}
              onUploadComplete={handleUploadComplete}
            />
          </div>

          {(isLoading || scanMutation.isPending) && (
            <Progress value={30} className="w-full" />
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">{String(error)}</p>
            </div>
          )}

          {/* File View Tabs */}
          <Tabs defaultValue="all">
            <div className="flex justify-between items-center mb-2">
              <TabsList>
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
                <TabsTrigger value="deletion" onClick={() => setOrganizationView('delete-candidates')}>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Deletion
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="mt-0">
              {directoryData ? (
                <Card>
                  <CardContent className="p-4">
                    <DirectoryTree 
                      data={directoryData} 
                      onSelect={handleFileSelect}
                      currentPath={currentPath}
                      multiSelect={isBatchMode}
                      selectedDirs={selectedDirectories}
                      onMultiSelectChange={setSelectedDirectories}
                      isProcessingBatch={batchScanMutation.isPending}
                    />
                  </CardContent>
                </Card>
              ) : !isLoading && !error && (
                <div className="text-center py-8 text-muted-foreground">
                  No directory data available
                </div>
              )}
            </TabsContent>

            <TabsContent value="high-quality" className="mt-0">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-green-500" />
                        <h3 className="font-medium">High Quality Files</h3>
                      </div>
                      <Button 
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => handleBatchOrganize('high-quality')}
                        disabled={!directoryData || batchOrganizeMutation.isPending}
                      >
                        <MoveRight className="h-4 w-4" />
                        {batchOrganizeMutation.isPending ? 'Processing...' : 'Batch Organize'}
                      </Button>
                    </div>
                    {directoryData ? (
                      <DirectoryTree 
                        data={{
                          ...directoryData,
                          children: filterHighQualityFiles(directoryData)
                        }} 
                        onSelect={handleFileSelect}
                        currentPath={currentPath}
                        multiSelect={isBatchMode}
                        selectedDirs={selectedDirectories}
                        onMultiSelectChange={setSelectedDirectories}
                        isProcessingBatch={batchScanMutation.isPending}
                      />
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No high quality files found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="monetizable" className="mt-0">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        <h3 className="font-medium">Monetization-Eligible Files</h3>
                      </div>
                      <Button 
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => handleBatchOrganize('monetizable')}
                        disabled={!directoryData || batchOrganizeMutation.isPending}
                      >
                        <MoveRight className="h-4 w-4" />
                        {batchOrganizeMutation.isPending ? 'Processing...' : 'Batch Organize'}
                      </Button>
                    </div>
                    {directoryData ? (
                      <DirectoryTree 
                        data={{
                          ...directoryData,
                          children: filterMonetizableFiles(directoryData)
                        }} 
                        onSelect={handleFileSelect}
                        currentPath={currentPath}
                        multiSelect={isBatchMode}
                        selectedDirs={selectedDirectories}
                        onMultiSelectChange={setSelectedDirectories}
                        isProcessingBatch={batchScanMutation.isPending}
                      />
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No monetizable files found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deletion" className="mt-0">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <h3 className="font-medium">Files Marked for Deletion</h3>
                      </div>
                      <Button 
                        size="sm"
                        variant="destructive"
                        className="flex items-center gap-1"
                        onClick={() => handleBatchOrganize('deletion')}
                        disabled={!directoryData || batchOrganizeMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        {batchOrganizeMutation.isPending ? 'Processing...' : 'Batch Process'}
                      </Button>
                    </div>
                    {directoryData ? (
                      <DirectoryTree 
                        data={{
                          ...directoryData,
                          children: filterDeletionFiles(directoryData)
                        }} 
                        onSelect={handleFileSelect}
                        currentPath={currentPath}
                        multiSelect={isBatchMode}
                        selectedDirs={selectedDirectories}
                        onMultiSelectChange={setSelectedDirectories}
                        isProcessingBatch={batchScanMutation.isPending}
                      />
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No files marked for deletion
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Daily Activity & Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Daily Activity & Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="daily-report">
                <TabsList className="w-full rounded-none px-6">
                  <TabsTrigger value="daily-report">Daily Report</TabsTrigger>
                  <TabsTrigger value="logs">System Logs</TabsTrigger>
                </TabsList>
                
                <TabsContent value="daily-report" className="p-6">
                  {dailyReport ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Files Processed Today ({dailyReport.filesProcessed.length})
                        </h3>
                        {dailyReport.filesProcessed.length > 0 ? (
                          <div className="bg-muted/40 rounded-md p-3 max-h-40 overflow-y-auto">
                            <div className="space-y-2">
                              {dailyReport.filesProcessed.map((file, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span className="truncate max-w-[70%]">{file.path.split('/').pop()}</span>
                                  <Badge variant={file.quality === 'Good' ? 'default' : 'outline'}>
                                    {file.quality}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No files processed today</p>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          Deletion Candidates ({dailyReport.deletions.length})
                        </h3>
                        {dailyReport.deletions.length > 0 ? (
                          <div className="bg-destructive/5 rounded-md p-3 max-h-40 overflow-y-auto">
                            <div className="space-y-2">
                              {dailyReport.deletions.map((file, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span className="truncate max-w-[70%]">{file.path.split('/').pop()}</span>
                                  <span className="text-xs text-muted-foreground">{file.reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No files marked for deletion today</p>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <MoveRight className="h-4 w-4" />
                          Organization Changes ({dailyReport.organizationChanges.length})
                        </h3>
                        {dailyReport.organizationChanges.length > 0 ? (
                          <div className="bg-muted/40 rounded-md p-3 max-h-40 overflow-y-auto">
                            <div className="space-y-2">
                              {dailyReport.organizationChanges.map((change, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span className="truncate max-w-[70%]">{change.path.split('/').pop()}</span>
                                  <Badge variant="outline">
                                    {change.action.replace('_', ' ')}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No organization changes today</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No daily report available</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="logs" className="p-6">
                  <LogViewer />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: File Assessment & External Services */}
        <div className="space-y-4">
          <FileAssessment filePath={selectedFile} />
          
          <ExternalServices 
            onNavigate={(path) => setCurrentPath(path)}
            onImport={() => {}} // Not implementing import functionality yet
            onConnect={(service, token) => {
              toast({
                title: `${service} Connected`,
                description: `Successfully connected to ${service}`,
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Helper function to filter high quality files
function filterHighQualityFiles(entry: DirectoryEntry): DirectoryEntry[] {
  if (!entry.children) return [];
  
  return entry.children.filter(child => {
    if (child.type === 'file') {
      return child.assessment && child.assessment.qualityScore === 'Good';
    }
    return false;
  });
}

// Helper function to filter monetizable files
function filterMonetizableFiles(entry: DirectoryEntry): DirectoryEntry[] {
  if (!entry.children) return [];
  
  return entry.children.filter(child => {
    if (child.type === 'file') {
      return child.assessment && child.assessment.monetizationEligible;
    }
    return false;
  });
}

// Helper function to filter files marked for deletion
function filterDeletionFiles(entry: DirectoryEntry): DirectoryEntry[] {
  if (!entry.children) return [];
  
  return entry.children.filter(child => {
    if (child.type === 'file') {
      return child.assessment && child.assessment.needsDeletion;
    }
    return false;
  });
}