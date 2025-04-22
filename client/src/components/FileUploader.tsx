import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, FileImage, FileCode, FileVideo, File as FileIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface FileUploaderProps {
  onUploadComplete?: () => void;
  currentDirectory: string;
}

export function FileUploader({ onUploadComplete, currentDirectory }: FileUploaderProps) {
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('directory', currentDirectory);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
      setProgress(0);
      if (onUploadComplete) {
        onUploadComplete();
      }
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: String(error),
        variant: "destructive",
      });
      setProgress(0);
    },
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    try {
      if (!file) return;
      setProgress(10);
      await uploadMutation.mutateAsync(file);
      setProgress(100);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
      setProgress(0);
    }
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  // Get appropriate icon for file type
  const getFileIcon = (fileType: string) => {
    if (fileType.match(/^image\//)) return <FileImage className="h-10 w-10 text-blue-500" />;
    if (fileType.match(/^video\//)) return <FileVideo className="h-10 w-10 text-purple-500" />;
    if (fileType.match(/^text\//) || fileType.includes('javascript')) return <FileCode className="h-10 w-10 text-green-500" />;
    if (fileType.includes('pdf') || fileType.includes('document')) return <FileText className="h-10 w-10 text-amber-500" />;
    return <FileIcon className="h-10 w-10 text-gray-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Upload className="h-5 w-5" />
          File Upload
        </CardTitle>
        <CardDescription>
          Upload files to {currentDirectory || 'root'} directory
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Drag and drop area */}
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-3">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Drag and drop your files here</p>
                <p className="text-xs text-muted-foreground">
                  Supports documents, images, code files, and more
                </p>
              </div>
              
              <Button 
                variant="outline"
                disabled={uploadMutation.isPending}
                className="mt-4"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <Upload className="h-4 w-4" />
                  <span>Choose File</span>
                  <input
                    id="file-upload-input"
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploadMutation.isPending}
                  />
                </label>
              </Button>
            </div>
          </div>

          {/* Progress indicator */}
          {(uploadMutation.isPending || progress > 0) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full h-2" />
            </div>
          )}

          {/* File type information */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-muted/20 p-3 rounded-lg">
            <div className="flex flex-col items-center gap-1">
              {getFileIcon('image/png')}
              <span className="text-xs">Images</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              {getFileIcon('application/pdf')}
              <span className="text-xs">Documents</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              {getFileIcon('text/javascript')}
              <span className="text-xs">Code</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              {getFileIcon('video/mp4')}
              <span className="text-xs">Videos</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              {getFileIcon('text/markdown')}
              <span className="text-xs">Markdown</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
