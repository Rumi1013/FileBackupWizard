import { Button } from "@/components/ui/button";
import { Github, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import GitHubRepositoryManager from "@/components/GitHubRepositoryManager";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "../lib/apiRequest";

export default function GitHubPage() {
  const [hasGitHubToken, setHasGitHubToken] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gitHubToken, setGitHubToken] = useState("");
  const { toast } = useToast();

  // Check if GitHub token exists
  useEffect(() => {
    const checkToken = async () => {
      try {
        const response = await apiRequest('/api/github/repos', {
          method: 'GET',
        });
        setHasGitHubToken(true);
      } catch (error: any) {
        if (error?.message?.includes('No GitHub token found')) {
          setHasGitHubToken(false);
        } else {
          console.error('Error checking GitHub token:', error);
          setHasGitHubToken(false);
        }
      }
    };

    checkToken();
  }, []);

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!gitHubToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid GitHub token",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // In a real application, you would send this to a secure endpoint
      // For demonstration, we'll just use localStorage
      localStorage.setItem('GITHUB_TOKEN', gitHubToken);
      
      // Reload the page to apply the token
      window.location.reload();
    } catch (error) {
      console.error('Error saving GitHub token:', error);
      toast({
        title: "Error",
        description: "Failed to save GitHub token",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Github className="h-6 w-6" />
          <h1 className="text-2xl font-bold">GitHub Repository Manager</h1>
        </div>
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to File Manager
          </Button>
        </Link>
      </div>

      {hasGitHubToken === null ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
        </div>
      ) : hasGitHubToken ? (
        <GitHubRepositoryManager />
      ) : (
        <div className="max-w-lg mx-auto mt-8 p-6 border rounded-lg shadow-sm">
          <Github className="h-12 w-12 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-center mb-2">GitHub Token Required</h2>
          <p className="text-muted-foreground text-center mb-6">
            To access and manage your GitHub repositories, you need to provide a personal access token with repo scope.
          </p>
          
          <form onSubmit={handleTokenSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="token" className="block text-sm font-medium mb-1">
                  GitHub Personal Access Token
                </label>
                <input
                  type="text"
                  id="token"
                  value={gitHubToken}
                  onChange={(e) => setGitHubToken(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Create a token with 'repo' scope at{" "}
                  <a 
                    href="https://github.com/settings/tokens" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    github.com/settings/tokens
                  </a>
                </p>
              </div>
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Token & Continue"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}