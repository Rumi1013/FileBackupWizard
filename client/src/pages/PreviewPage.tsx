import { useState } from 'react';
import { Link } from 'wouter';
import { FilePreview } from '../components/FilePreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileIcon, Home } from 'lucide-react';

export default function PreviewPage() {
  const [filePath, setFilePath] = useState<string>('');
  const [fileId, setFileId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('path');
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<{ 
    type: 'path' | 'id'; 
    value: string 
  } | null>(null);

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filePath) {
      setPreviewData({ type: 'path', value: filePath });
      setShowPreview(true);
    }
  };

  const handleIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fileId) {
      setPreviewData({ type: 'id', value: fileId });
      setShowPreview(true);
    }
  };

  return (
    <div className="container py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <Home className="h-4 w-4 mr-2" />
            Home
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">File Previews</h1>
          <p className="text-muted-foreground mt-2">
            Preview and inspect file content directly in the browser with support for various file types.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileIcon className="h-5 w-5 mr-2" />
              Select a File
            </CardTitle>
            <CardDescription>
              Enter a file path or ID to generate a preview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="path" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="path">By Path</TabsTrigger>
                <TabsTrigger value="id">By ID</TabsTrigger>
              </TabsList>
              
              <TabsContent value="path" className="space-y-4">
                <form onSubmit={handlePathSubmit} className="flex space-x-2 mt-4">
                  <Input
                    placeholder="Enter file path (e.g., /path/to/file.txt)"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!filePath}>Preview</Button>
                </form>
              </TabsContent>
              
              <TabsContent value="id" className="space-y-4">
                <form onSubmit={handleIdSubmit} className="flex space-x-2 mt-4">
                  <Input
                    placeholder="Enter file ID"
                    value={fileId}
                    onChange={(e) => setFileId(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!fileId}>Preview</Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {showPreview && previewData && (
          <div className="mt-4">
            {previewData.type === 'path' ? (
              <FilePreview filePath={previewData.value} />
            ) : (
              <FilePreview fileId={previewData.value} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}