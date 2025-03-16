import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DirectoryTree } from "./DirectoryTree";
import { LogViewer } from "./LogViewer";
import { ContentAnalyzer } from "./ContentAnalyzer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FolderPlus
} from "lucide-react";
import type { DirectoryEntry } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { FileUploader } from "./FileUploader";

export function FileManager() {
  const [currentPath, setCurrentPath] = useState("/");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { toast } = useToast();

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

  const handleFileSelect = (path: string) => {
    setSelectedFile(path);
  };

  const handleUploadComplete = () => {
    refetch();
  };

  const handlePathChange = (newPath: string) => {
    setCurrentPath(newPath);
  };

  const goToRoot = () => {
    setCurrentPath("/");
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean);

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
                disabled={scanMutation.isPending}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${scanMutation.isPending ? 'animate-spin' : ''}`} />
                Scan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Panel: File Browser */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
                  <Upload className="h-6 w-6 mb-2" />
                  <span>Upload</span>
                </Button>
                <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
                  <FolderPlus className="h-6 w-6 mb-2" />
                  <span>New Folder</span>
                </Button>
                <Button variant="outline" className="flex flex-col items-center p-4 h-auto" disabled={!selectedFile}>
                  <FileText className="h-6 w-6 mb-2" />
                  <span>Analyze</span>
                </Button>
                <Button variant="outline" className="flex flex-col items-center p-4 h-auto text-destructive" disabled={!selectedFile}>
                  <Trash className="h-6 w-6 mb-2" />
                  <span>Delete</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <FileUploader 
            currentDirectory={currentPath}
            onUploadComplete={handleUploadComplete}
          />

          {(isLoading || scanMutation.isPending) && (
            <Progress value={30} className="w-full" />
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">{String(error)}</p>
            </div>
          )}

          <Tabs defaultValue="files">
            <TabsList>
              <TabsTrigger value="files">
                <Folder className="mr-2 h-4 w-4" />
                Files
              </TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="files">
              {directoryData ? (
                <DirectoryTree 
                  data={directoryData} 
                  onSelect={handleFileSelect}
                  currentPath={currentPath}
                />
              ) : !isLoading && !error && (
                <div className="text-center py-8 text-muted-foreground">
                  No directory data available
                </div>
              )}
            </TabsContent>

            <TabsContent value="logs">
              <LogViewer />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel: Content Analysis */}
        <div>
          <ContentAnalyzer filePath={selectedFile} />
        </div>
      </div>
    </div>
  );
}