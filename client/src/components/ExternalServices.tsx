import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Folder, 
  RefreshCw, 
  ChevronRight, 
  Cloud,
  DownloadCloud,
  UploadCloud,
  Link,
  ExternalLink,
  LogIn,
  Box,
  FileText,
  SquareCode,
  FileImage,
  Database
} from "lucide-react";

interface ExternalServicesProps {
  onNavigate: (path: string) => void;
  onImport: (files: File[]) => void;
  onConnect: (service: string, token: string) => void;
}

export function ExternalServices({ onNavigate, onImport, onConnect }: ExternalServicesProps) {
  const [authCode, setAuthCode] = useState("");
  const [customPath, setCustomPath] = useState("");
  const { toast } = useToast();

  const handleConnect = (service: string) => {
    // In a real implementation, we would redirect to OAuth flow
    // For now, show a toast message
    toast({
      title: `${service} Integration`,
      description: `This would start the OAuth flow for ${service} in a production environment.`,
      duration: 3000,
    });
  };

  const handleAuthCodeSubmit = (service: string) => {
    if (!authCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter an authorization code",
        variant: "destructive",
      });
      return;
    }

    // Call the onConnect handler with the service and code
    onConnect(service, authCode);
    setAuthCode("");

    toast({
      title: "Connection Initiated",
      description: `Attempting to connect to ${service}...`,
    });
  };

  const handleDirectNavigation = () => {
    if (!customPath.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid path",
        variant: "destructive",
      });
      return;
    }

    onNavigate(customPath);
    setCustomPath("");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          External Resources
        </CardTitle>
        <CardDescription>
          Connect to external storage services or navigate directly to computer resources
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="direct">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="direct">Direct Navigation</TabsTrigger>
            <TabsTrigger value="cloud">Cloud Services</TabsTrigger>
            <TabsTrigger value="connect">Connect New</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="customPath">Navigate to Path</Label>
              <div className="flex gap-2">
                <Input
                  id="customPath"
                  placeholder="/path/to/directory"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                />
                <Button onClick={handleDirectNavigation}>
                  <ChevronRight className="h-4 w-4 mr-2" />
                  Go
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button variant="outline" onClick={() => onNavigate("/")}>
                <Folder className="h-4 w-4 mr-2" />
                Root
              </Button>
              <Button variant="outline" onClick={() => onNavigate("/home")}>
                <Folder className="h-4 w-4 mr-2" />
                Home
              </Button>
              <Button variant="outline" onClick={() => onNavigate("/home/runner")}>
                <Folder className="h-4 w-4 mr-2" />
                User
              </Button>
              <Button variant="outline" onClick={() => onNavigate("/home/runner/workspace")}>
                <Folder className="h-4 w-4 mr-2" />
                Workspace
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="cloud" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Cloud className="h-5 w-5 mr-2 text-blue-600" />
                      Dropbox
                    </CardTitle>
                    <Button size="sm" variant="ghost">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardFooter className="p-4 pt-0 flex justify-between">
                  <span className="text-xs text-muted-foreground">Not connected</span>
                  <Button variant="outline" size="sm" onClick={() => handleConnect("Dropbox")}>
                    <LogIn className="h-3 w-3 mr-1" />
                    Connect
                  </Button>
                </CardFooter>
              </Card>

              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <DownloadCloud className="h-5 w-5 mr-2 text-green-600" />
                      Google Drive
                    </CardTitle>
                    <Button size="sm" variant="ghost">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardFooter className="p-4 pt-0 flex justify-between">
                  <span className="text-xs text-muted-foreground">Not connected</span>
                  <Button variant="outline" size="sm" onClick={() => handleConnect("Google Drive")}>
                    <LogIn className="h-3 w-3 mr-1" />
                    Connect
                  </Button>
                </CardFooter>
              </Card>

              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-blue-500" />
                      OneDrive
                    </CardTitle>
                    <Button size="sm" variant="ghost">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardFooter className="p-4 pt-0 flex justify-between">
                  <span className="text-xs text-muted-foreground">Not connected</span>
                  <Button variant="outline" size="sm" onClick={() => handleConnect("OneDrive")}>
                    <LogIn className="h-3 w-3 mr-1" />
                    Connect
                  </Button>
                </CardFooter>
              </Card>

              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Box className="h-5 w-5 mr-2 text-blue-700" />
                      Box
                    </CardTitle>
                    <Button size="sm" variant="ghost">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardFooter className="p-4 pt-0 flex justify-between">
                  <span className="text-xs text-muted-foreground">Not connected</span>
                  <Button variant="outline" size="sm" onClick={() => handleConnect("Box")}>
                    <LogIn className="h-3 w-3 mr-1" />
                    Connect
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="connect" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="authCode">Authorization Code</Label>
              <Input
                id="authCode"
                placeholder="Paste authorization code here"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button onClick={() => handleAuthCodeSubmit("Dropbox")}>
                <Cloud className="h-4 w-4 mr-2" />
                Connect Dropbox
              </Button>
              <Button onClick={() => handleAuthCodeSubmit("Google Drive")}>
                <DownloadCloud className="h-4 w-4 mr-2" />
                Connect Google Drive
              </Button>
              <Button onClick={() => handleAuthCodeSubmit("OneDrive")}>
                <FileText className="h-4 w-4 mr-2" />
                Connect OneDrive
              </Button>
              <Button onClick={() => handleAuthCodeSubmit("Box")}>
                <Box className="h-4 w-4 mr-2" />
                Connect Box
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}