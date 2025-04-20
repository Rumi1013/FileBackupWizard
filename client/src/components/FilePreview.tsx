import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardIcon, 
  FileIcon, 
  ImageIcon, 
  FileTextIcon, 
  FileX2Icon, 
  FileCodeIcon, 
  LightbulbIcon, 
  SparklesIcon,
  RefreshCwIcon,
  InfoIcon
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { FilePreview as FilePreviewType } from '@shared/schema';

interface FilePreviewProps {
  filePath?: string;
  fileId?: string;
}

export function FilePreview({ filePath, fileId }: FilePreviewProps) {
  const { toast } = useToast();
  const [previewType, setPreviewType] = useState<string>('text');
  const [path, setPath] = useState<string>(filePath || '');
  const [showRecommendations, setShowRecommendations] = useState(false);
  
  // Query for file preview based on path or ID
  const { data, isLoading, isError, error, refetch } = useQuery<FilePreviewType>({
    queryKey: [fileId ? `/api/previews/id/${fileId}` : `/api/previews/file`, { filePath: path, previewType }],
    enabled: Boolean(fileId || path),
    refetchOnWindowFocus: false,
  });
  
  // Query for recommendations for this file
  const { data: recommendations, isLoading: isLoadingRecommendations } = useQuery({
    queryKey: ['/api/recommendations/file', encodeURIComponent(path)],
    enabled: Boolean(path) && showRecommendations,
    refetchOnWindowFocus: false,
  });
  
  // Mutation to generate recommendations for a file
  const generateRecommendationsMutation = useMutation({
    mutationFn: async () => {
      if (!path) return null;
      return apiRequest('POST', '/api/recommendations/generate', { filePath: path });
    },
    onSuccess: () => {
      toast({
        title: "Recommendations Generated",
        description: "AI has analyzed your file and provided recommendations.",
      });
      setShowRecommendations(true);
    },
    onError: (error) => {
      toast({
        title: "Error Generating Recommendations",
        description: String(error),
        variant: "destructive",
      });
    }
  });

  // Handle form submission to preview a new file
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
    // Reset recommendations when loading a new file
    setShowRecommendations(false);
  };

  // Helper to determine the language for syntax highlighting
  const getLanguage = (fileType: string): string => {
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'jsx',
      '.ts': 'typescript',
      '.tsx': 'tsx',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.less': 'less',
      '.json': 'json',
      '.md': 'markdown',
      '.py': 'python',
      '.rb': 'ruby',
      '.java': 'java',
      '.c': 'c',
      '.cpp': 'cpp',
      '.cs': 'csharp',
      '.go': 'go',
      '.php': 'php',
      '.sh': 'bash',
      '.sql': 'sql',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.xml': 'xml'
    };
    
    return languageMap[fileType] || 'text';
  };
  
  // Check if the file is a code file that should use syntax highlighting
  const isCodeFile = (fileType: string): boolean => {
    return [
      '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss', '.less',
      '.json', '.md', '.py', '.rb', '.java', '.c', '.cpp', '.cs',
      '.go', '.php', '.sh', '.sql', '.yaml', '.yml', '.xml'
    ].includes(fileType);
  };

  // Determine content to display based on preview type and file type
  const renderPreviewContent = () => {
    if (!data) return null;

    switch (previewType) {
      case 'text':
        // Use syntax highlighting for code files
        if (isCodeFile(data.fileType)) {
          return (
            <ScrollArea className="h-[400px] w-full rounded border bg-muted/20">
              {data.truncated && (
                <Badge variant="outline" className="mb-2 bg-yellow-500/10 text-yellow-600 absolute top-2 right-2 z-10">
                  File truncated due to size
                </Badge>
              )}
              <SyntaxHighlighter
                language={getLanguage(data.fileType)}
                style={oneDark}
                customStyle={{ margin: 0, borderRadius: '4px', height: '100%' }}
                wrapLongLines
              >
                {data.content}
              </SyntaxHighlighter>
            </ScrollArea>
          );
        } else {
          // Regular text files without syntax highlighting
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
        }
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
    } else if (isCodeFile(data.fileType)) {
      return <FileCodeIcon className="h-5 w-5" />;
    } else if (['.txt', '.md', '.doc', '.docx', '.pdf'].includes(data.fileType)) {
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
        <>
          {/* Recommendations Section */}
          {showRecommendations && recommendations && recommendations.length > 0 && (
            <div className="px-6 pt-2 pb-6 border-t">
              <div className="flex items-center gap-2 mb-3">
                <LightbulbIcon className="h-5 w-5 text-amber-500" />
                <h3 className="font-medium">Smart Recommendations</h3>
              </div>
              
              <div className="space-y-3">
                {recommendations.slice(0, 3).map((recommendation: any) => (
                  <div 
                    key={recommendation.id}
                    className={`p-3 rounded-md text-sm relative border-l-4 ${
                      recommendation.recommendation_type === 'quality_improvement' 
                        ? 'border-blue-400 bg-blue-50/30' 
                        : recommendation.recommendation_type === 'organization'
                        ? 'border-purple-400 bg-purple-50/30'
                        : recommendation.recommendation_type === 'monetization'
                        ? 'border-green-400 bg-green-50/30'
                        : 'border-red-400 bg-red-50/30'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p>{recommendation.recommendation_text}</p>
                      
                      <div className="flex gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => {
                                  // Mark as implemented via API
                                  fetch(`/api/recommendations/${recommendation.id}/implement`, {
                                    method: 'PATCH',
                                    headers: {'Content-Type': 'application/json'},
                                    body: JSON.stringify({implemented: true})
                                  });
                                  
                                  // Show success message
                                  toast({
                                    title: "Recommendation Applied",
                                    description: "Marked as implemented.",
                                  });
                                }}
                              >
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Mark as implemented</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                ))}
                
                {recommendations.length > 3 && (
                  <div className="text-center">
                    <Button variant="link" size="sm" onClick={() => window.open('/recommendations', '_blank')}>
                      View all {recommendations.length} recommendations
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <CardFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCwIcon className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={isCodeFile(data.fileType) ? "default" : "outline"} 
                      size="sm"
                      onClick={() => {
                        if (!showRecommendations) {
                          generateRecommendationsMutation.mutate();
                        } else {
                          setShowRecommendations(false);
                        }
                      }}
                      disabled={generateRecommendationsMutation.isPending}
                    >
                      {generateRecommendationsMutation.isPending ? (
                        <>
                          <SparklesIcon className="h-4 w-4 mr-2 animate-pulse" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <LightbulbIcon className="h-4 w-4 mr-2" />
                          {showRecommendations ? "Hide Recommendations" : "Smart Recommendations"}
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Get AI-powered suggestions for this file</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(data.content);
                toast({
                  title: "Content Copied",
                  description: "File content copied to clipboard.",
                });
              }}
            >
              <ClipboardIcon className="h-4 w-4 mr-2" />
              Copy Content
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}