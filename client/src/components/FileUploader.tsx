import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface FileUploaderProps {
  onUploadComplete?: () => void;
  currentDirectory: string;
}

export function FileUploader({ onUploadComplete, currentDirectory }: FileUploaderProps) {
  const [progress, setProgress] = useState(0);
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

    try {
      setProgress(10);
      await uploadMutation.mutateAsync(file);
      setProgress(100);
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="w-full"
          disabled={uploadMutation.isPending}
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <Upload className="h-4 w-4" />
            <span>Choose File to Upload</span>
            <input
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploadMutation.isPending}
            />
          </label>
        </Button>
      </div>

      {(uploadMutation.isPending || progress > 0) && (
        <Progress value={progress} className="w-full" />
      )}
    </div>
  );
}
