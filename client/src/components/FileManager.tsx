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
import { useToast } from "@/hooks/use-toast";
import { Folder, RefreshCw, ChevronRight } from "lucide-react";
import type { DirectoryEntry } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { FileUploader } from "./FileUploader";

export function FileManager() {
  const [currentPath, setCurrentPath] = useState("/documents");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: directoryData, isLoading, refetch } = useQuery<DirectoryEntry>({
    queryKey: ['/api/files/scan', currentPath],
    queryFn: () => fetch(`/api/files/scan?path=${encodeURIComponent(currentPath)}`).then(res => res.json())
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
        description: `Failed to scan directory: ${error}`,
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

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-4">
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

          <div className="flex gap-2">
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

        <FileUploader 
          currentDirectory={currentPath}
          onUploadComplete={handleUploadComplete}
        />

        {(isLoading || scanMutation.isPending) && (
          <Progress value={30} className="w-full" />
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
            ) : isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading directory contents...
              </div>
            ) : (
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

      <div>
        <ContentAnalyzer filePath={selectedFile} />
      </div>
    </div>
  );
}