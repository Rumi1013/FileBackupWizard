import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';
import { 
  Database, 
  FolderOpen, 
  HardDrive, 
  Cloud, 
  Package, 
  Github, 
  CloudCog, 
  ChevronRight, 
  Home, 
  RefreshCw, 
  Folder, 
  FileIcon, 
  ArrowUp, 
  Search, 
  ChevronLeft
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from './ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from './ui/skeleton';
import { ScrollArea } from './ui/scroll-area';

type StorageProviderType = 'local' | 'dropbox' | 'google-drive' | 'github' | 'cloudflare' | 'mm-storage' | 'custom';

interface StorageProvider {
  id: StorageProviderType;
  name: string;
  icon: React.ReactNode;
  basePath?: string;
  description: string;
  connected: boolean;
}

interface DirectoryEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink' | 'unknown' | 'error';
  children?: DirectoryEntry[];
  size?: number;
  hidden?: boolean;
  error?: string;
  max_depth_reached?: boolean;
  status?: string;
  last_modified?: number;
  permission_error?: boolean;
  cycle_detected?: boolean;
  suggestion?: string;
  suggestedPath?: string;
  message?: string;
  excluded?: boolean;
  restricted?: boolean;
}

interface StorageSelectorProps {
  onStorageSelect: (path: string, provider: StorageProviderType) => void;
  currentPath: string;
}

export default function StorageSelector({ onStorageSelect, currentPath }: StorageSelectorProps) {
  const [customPath, setCustomPath] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<StorageProviderType>('local');
  const [browserPath, setBrowserPath] = useState('/');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Update browserPath when popup opens
  useEffect(() => {
    if (isPopoverOpen) {
      setBrowserPath(currentPath || '/');
    }
  }, [isPopoverOpen, currentPath]);

  // Query for directory data
  const { data: directoryData, isLoading, error, refetch } = useQuery<DirectoryEntry>({
    queryKey: ['/api/files/scan', browserPath],
    queryFn: async () => {
      const response = await fetch(`/api/files/scan?path=${encodeURIComponent(browserPath)}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to scan directory');
      }
      return response.json();
    },
    enabled: isPopoverOpen // Only fetch when the popover is open
  });

  // Storage providers configuration
  const storageProviders: StorageProvider[] = [
    {
      id: 'local',
      name: 'Local Files',
      icon: <HardDrive className="h-5 w-5" />,
      basePath: '/',
      description: 'Access files on this computer',
      connected: true
    },
    {
      id: 'mm-storage',
      name: 'MM Workspace',
      icon: <Package className="h-5 w-5" />,
      basePath: '/midnight-magnolia',
      description: 'Midnight Magnolia dedicated workspace',
      connected: true
    },
    {
      id: 'local',
      name: 'Home Directory',
      icon: <Home className="h-5 w-5" />,
      basePath: '~',
      description: 'Access your home directory',
      connected: true
    },
    {
      id: 'local',
      name: 'Downloads',
      icon: <FolderOpen className="h-5 w-5" />,
      basePath: '~/Downloads',
      description: 'Access your Downloads folder',
      connected: true
    },
    {
      id: 'local',
      name: 'Documents',
      icon: <FileIcon className="h-5 w-5" />,
      basePath: '~/Documents',
      description: 'Access your Documents folder',
      connected: true
    },
    {
      id: 'local',
      name: 'Pictures',
      icon: <FolderOpen className="h-5 w-5" />,
      basePath: '~/Pictures',
      description: 'Access your Pictures folder',
      connected: true
    },
    {
      id: 'local',
      name: 'Workspace',
      icon: <FolderOpen className="h-5 w-5" />,
      basePath: '/workspace',
      description: 'Access the workspace directory',
      connected: true
    },
    {
      id: 'dropbox',
      name: 'Dropbox',
      icon: <Database className="h-5 w-5" />,
      description: 'Connect to your Dropbox account',
      connected: false
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      icon: <Cloud className="h-5 w-5" />,
      description: 'Access files from Google Drive',
      connected: false
    },
    {
      id: 'github',
      name: 'GitHub',
      icon: <Github className="h-5 w-5" />,
      description: 'Access repositories from GitHub',
      connected: false
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare',
      icon: <CloudCog className="h-5 w-5" />,
      description: 'Access files from Cloudflare R2',
      connected: false
    }
  ];

  function handleProviderSelect(provider: StorageProvider) {
    if (provider.connected && provider.basePath) {
      setActiveTab(provider.id);
      setBrowserPath(provider.basePath);
    } else {
      // In a real app, this would trigger an authentication flow
      console.log(`Connect to ${provider.name} first`);
    }
  }

  function handleCustomPathSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (customPath) {
      setBrowserPath(customPath);
      setCustomPath('');
    }
  }

  function handleNavigate(path: string) {
    setBrowserPath(path);
    setSelectedFile(null);
  }

  function handleParentDirectory() {
    const parts = browserPath.split('/').filter(Boolean);
    if (parts.length > 0) {
      parts.pop();
      const parentPath = '/' + parts.join('/');
      handleNavigate(parentPath);
    } else {
      handleNavigate('/');
    }
  }

  function handleDirectorySelect(entry: DirectoryEntry) {
    if (entry.type === 'directory') {
      handleNavigate(entry.path);
    } else {
      setSelectedFile(entry.path);
    }
  }

  function handleFileSelect() {
    if (selectedFile) {
      onStorageSelect(selectedFile, activeTab);
      setIsPopoverOpen(false);
    } else if (browserPath) {
      onStorageSelect(browserPath, activeTab);
      setIsPopoverOpen(false);
    }
  }

  // Breadcrumbs array
  const breadcrumbs = browserPath.split('/').filter(Boolean);

  // Filter entries based on search query
  function filterEntries(entries?: DirectoryEntry[]): DirectoryEntry[] {
    if (!entries) return [];
    
    if (!searchQuery) return entries;
    
    return entries.filter(entry => 
      entry.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  return (
    <div className="mb-4">
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-start border-dashed"
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            <span className="truncate">
              {currentPath || 'Select Storage Location'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] p-0" align="start">
          <Card className="border-0">
            <CardHeader className="px-4 py-3 border-b">
              <Tabs defaultValue={activeTab} value={activeTab} onValueChange={(value) => setActiveTab(value as StorageProviderType)}>
                <TabsList className="grid grid-cols-6">
                  {storageProviders.map(provider => (
                    <TabsTrigger 
                      key={provider.id} 
                      value={provider.id}
                      onClick={() => handleProviderSelect(provider)}
                      disabled={!provider.connected}
                      className="flex items-center gap-1"
                    >
                      {provider.icon}
                      <span className="hidden sm:inline-block text-xs">{provider.name}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                <div className="flex items-center gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={() => handleNavigate('/')}
                    title="Home"
                  >
                    <Home className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={handleParentDirectory}
                    title="Go Up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>

                  <div className="flex-1">
                    <Breadcrumb className="bg-muted/30 rounded-md px-2 py-1">
                      <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => handleNavigate("/")} className="font-medium">
                          Root
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      {breadcrumbs.map((segment, index) => {
                        const path = '/' + breadcrumbs.slice(0, index + 1).join('/');
                        return (
                          <BreadcrumbItem key={path}>
                            <ChevronRight className="h-3 w-3" />
                            <BreadcrumbLink onClick={() => handleNavigate(path)} className="font-medium">
                              {segment}
                            </BreadcrumbLink>
                          </BreadcrumbItem>
                        );
                      })}
                    </Breadcrumb>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={() => refetch()}
                    title="Refresh"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="relative mt-3">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>

                <TabsContent value={activeTab} className="mt-3 p-0">
                  <ScrollArea className="h-[240px] rounded-md border">
                    {isLoading ? (
                      <div className="p-4 space-y-3">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ) : error ? (
                      <div className="p-4 space-y-2">
                        <div className="text-sm text-destructive font-medium">
                          Error loading directory: {String(error)}
                        </div>
                        {directoryData?.error && (
                          <div className="text-xs bg-muted/50 p-2 rounded-md">
                            {directoryData.error}
                          </div>
                        )}
                        {directoryData?.status === 'restricted' && (
                          <div className="text-xs text-amber-500">
                            This directory is restricted for security reasons.
                          </div>
                        )}
                        {directoryData?.status === 'not_found' && (
                          <div className="text-xs text-muted-foreground">
                            The directory does not exist or you don't have permission to access it.
                          </div>
                        )}
                        {directoryData?.suggestion && (
                          <div className="text-xs text-green-500 mt-2">
                            Suggestion: {directoryData.suggestion}
                            {directoryData.suggestedPath && (
                              <Button 
                                variant="link" 
                                className="text-xs p-0 h-auto ml-1 text-primary" 
                                onClick={() => handleNavigate(directoryData.suggestedPath as string)}
                              >
                                Go there
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : directoryData ? (
                      <div className="p-1">
                        {directoryData.children && directoryData.children.length > 0 ? (
                          <div className="grid grid-cols-1 gap-1">
                            {filterEntries(directoryData.children).map((entry) => (
                              <Button
                                key={entry.path}
                                variant={selectedFile === entry.path ? "default" : "ghost"}
                                className={`justify-start h-10 ${selectedFile === entry.path ? 'bg-primary/10' : ''}`}
                                onClick={() => handleDirectorySelect(entry)}
                              >
                                {entry.type === 'directory' ? (
                                  <Folder className={`h-5 w-5 mr-2 ${entry.max_depth_reached ? 'text-yellow-500' : 'text-primary'}`} />
                                ) : entry.type === 'file' ? (
                                  <FileIcon className={`h-5 w-5 mr-2 ${entry.hidden ? 'text-gray-400' : 'text-muted-foreground'}`} />
                                ) : entry.type === 'symlink' ? (
                                  <ChevronRight className="h-5 w-5 mr-2 text-blue-500" />
                                ) : entry.type === 'error' ? (
                                  <span className="h-5 w-5 mr-2 text-destructive">❌</span>
                                ) : (
                                  <FileIcon className="h-5 w-5 mr-2 text-muted-foreground" />
                                )}
                                <span className={`text-sm truncate ${entry.hidden ? 'italic text-gray-400' : ''} ${entry.error ? 'text-destructive' : ''} ${entry.cycle_detected ? 'text-yellow-400' : ''}`}>
                                  {entry.name}
                                </span>
                                {entry.size && entry.type === 'file' && (
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    {Math.round(entry.size / 1024)} KB
                                  </span>
                                )}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            No files or folders found
                          </div>
                        )}
                      </div>
                    ) : null}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardHeader>
            <CardFooter className="flex justify-between pt-3 pb-3 border-t">
              <form onSubmit={handleCustomPathSubmit} className="flex items-center gap-2 w-full">
                <Input
                  placeholder="Enter path manually..."
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="sm" variant="outline">Go</Button>
              </form>
              <Button 
                onClick={handleFileSelect} 
                disabled={!browserPath}
                className="ml-2"
              >
                Select
              </Button>
            </CardFooter>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}