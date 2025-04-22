import { FileManager } from "@/components/FileManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { FileIcon, EyeIcon, Sparkles, Github, Trash2 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Midnight Magnolia File Management</h1>
          <p className="text-muted-foreground">Organize, assess and preview your files</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/planner">
              <Calendar className="h-4 w-4 mr-2" />
              Planner
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/recommendations">
              <Sparkles className="h-4 w-4 mr-2" />
              AI Recommendations
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/preview">
              <EyeIcon className="h-4 w-4 mr-2" />
              File Preview
            </Link>
          </Button>
          <Button variant="destructive" asChild>
            <Link to="/github">
              <Github className="h-4 w-4 mr-2" />
              GitHub Cleanup
            </Link>
          </Button>
        </div>
      </div>
      
      <Card className="mx-auto max-w-7xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">File Manager</CardTitle>
              <CardDescription>Browse, manage and organize your files</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/recommendations">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get Recommendations
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/preview">
                  <FileIcon className="h-4 w-4 mr-2" />
                  Preview Files
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/github">
                  <Github className="h-4 w-4 mr-2" />
                  Clean GitHub
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FileManager />
        </CardContent>
      </Card>
    </div>
  );
}
