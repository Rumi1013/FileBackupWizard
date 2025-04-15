import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ClipboardIcon, FileIcon, ImageIcon, FileTextIcon, FileX2Icon } from 'lucide-react';
import type { FilePreview as FilePreviewType } from '@shared/schema';

interface FilePreviewProps {
  filePath?: string;
  fileId?: string;
}

export function FilePreview({ filePath, fileId }: FilePreviewProps) {
  const [previewType, setPreviewType] = useState<string>('text');
  const [path, setPath] = useState<string>(filePath || '');
  
  // Query for file preview based on path or ID
  const { data, isLoading, isError, error, refetch } = useQuery<FilePreviewType>({
    queryKey: [fileId ? `/api/previews/id/${fileId}` : `/api/previews/file`, { filePath: path, previewType }],
    enabled: Boolean(fileId || path),
    refetchOnWindowFocus: false,
  });

  // Handle form submission to preview a new file
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  // Determine content to display based on preview type and file type
  const renderPreviewContent = () => {
    if (!data) return null;

    switch (previewType) {
      case 'text':
        return (
          <ScrollArea className="h-[400px] w-full rounded border p-4 bg-muted/20 font-mono text-sm">
            {data.truncated && (
              <Badge variant="outline" className="mb-2 bg-yellow-500/10 text-yellow-600">
                File truncated due to size
              </Badge>
            )}
            <pre>{data.content}</pre>
          </ScrollArea>
        );
      case 'image':
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'].includes(data.fileType)) {
          return (
            <div className="flex justify-center items-center p-4">
              <img 
                src={`data:image/png;base64,${data.content}`} 
                alt={data.fileName} 
                className="max-h-[400px] max-w-full object-contain" 
              />
            </div>
          );
        } else {
          return (
            <div className="flex flex-col items-center justify-center h-[400px] bg-muted/20 rounded border">
              <FileX2Icon className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">This file type doesn't support image preview</p>
            </div>
          );
        }
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[400px] bg-muted/20 rounded border">
            <FileIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Preview not available for this file type</p>
          </div>
        );
    }
  };

  // Helper to get file icon based on file type
  const getFileIcon = () => {
    if (!data) return <FileIcon className="h-5 w-5" />;
    
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'].includes(data.fileType)) {
      return <ImageIcon className="h-5 w-5" />;
    } else if (['.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.json', '.py'].includes(data.fileType)) {
      return <FileTextIcon className="h-5 w-5" />;
    } else {
      return <FileIcon className="h-5 w-5" />;
    }
  };

  return (
    <Card className="w-full shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center">
          {getFileIcon()}
          <span className="ml-2">File Preview</span>
        </CardTitle>
        <CardDescription>
          View and inspect file contents with support for different file types
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* File path input - only shown if fileId is not provided */}
        {!fileId && (
          <form onSubmit={handleSubmit} className="flex space-x-2 mb-4">
            <Input
              placeholder="Enter file path to preview"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!path}>Preview</Button>
          </form>
        )}

        {/* Preview type tabs */}
        <Tabs defaultValue="text" onValueChange={setPreviewType} className="mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="image">Image</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Preview content area */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-[300px] w-full mt-4" />
          </div>
        ) : isError ? (
          <div className="p-8 text-center border rounded bg-destructive/10 text-destructive">
            <FileX2Icon className="h-12 w-12 mx-auto mb-4" />
            <p className="font-semibold">Error loading preview</p>
            <p className="text-sm mt-2">{(error as Error)?.message || 'The file could not be previewed'}</p>
          </div>
        ) : data ? (
          <>
            {/* File details */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <p className="text-muted-foreground">Filename</p>
                <p className="font-medium">{data.fileName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Size</p>
                <p className="font-medium">{(data.size / 1024).toFixed(2)} KB</p>
              </div>
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium">{data.fileType}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Modified</p>
                <p className="font-medium">{new Date(data.lastModified).toLocaleString()}</p>
              </div>
            </div>
            
            {/* Preview content */}
            {renderPreviewContent()}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[400px] bg-muted/20 rounded border">
            <FileIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Enter a file path to preview the content</p>
          </div>
        )}
      </CardContent>
      {data && (
        <CardFooter className="flex justify-between">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(data.content);
            }}
          >
            <ClipboardIcon className="h-4 w-4 mr-2" />
            Copy Content
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}