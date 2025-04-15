import { FileManager } from "@/components/FileManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { FileIcon, EyeIcon } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Midnight Magnolia File Management</h1>
          <p className="text-muted-foreground">Organize, assess and preview your files</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/preview">
              <EyeIcon className="h-4 w-4 mr-2" />
              File Preview
            </Link>
          </Button>
        </div>
      </div>
      
      <Card className="mx-auto max-w-7xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold">File Manager</CardTitle>
              <CardDescription>Browse, manage and organize your files</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/preview">
                <FileIcon className="h-4 w-4 mr-2" />
                Preview Files
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <FileManager />
        </CardContent>
      </Card>
    </div>
  );
}
