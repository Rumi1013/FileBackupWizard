import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { AlertCircle, Archive, Clock, ExternalLink, Github, Star, GitFork, Info, AlertTriangle, Trash2, Users, RefreshCw } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { queryClient } from '../lib/queryClient';
import { apiRequest } from '../lib/apiRequest';

type Repository = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  archived: boolean;
  disabled: boolean;
  open_issues_count: number;
  license: string | null;
  visibility: string;
  default_branch: string;
  last_activity_date: string;
  activity_score: number;
  usage_status: 'active' | 'inactive' | 'dormant';
};

type RepositoryStats = {
  total: number;
  active: number;
  inactive: number;
  dormant: number;
  repositories: {
    active?: Repository[];
    inactive?: Repository[];
    dormant?: Repository[];
  };
};

export default function GitHubRepositoryManager() {
  const [activeTab, setActiveTab] = useState<'active' | 'inactive' | 'dormant'>('dormant');
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { toast } = useToast();

  // Fetch repositories
  const { data: repoStats, isLoading, error, isError, refetch } = useQuery<RepositoryStats>({
    queryKey: ['/api/github/repos'],
    enabled: true,
  });

  // Batch archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (repositories: { owner: string; repo: string }[]) => {
      return apiRequest('/api/github/repos/batch-archive', {
        method: 'POST',
        body: JSON.stringify({ repositories }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `${selectedRepos.length} repositories have been archived`,
      });
      setSelectedRepos([]);
      queryClient.invalidateQueries({ queryKey: ['/api/github/repos'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to archive repositories: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Batch delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (repositories: { owner: string; repo: string }[]) => {
      return apiRequest('/api/github/repos/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ repositories }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `${selectedRepos.length} repositories have been permanently deleted`,
      });
      setSelectedRepos([]);
      setConfirmingDelete(false);
      queryClient.invalidateQueries({ queryKey: ['/api/github/repos'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to delete repositories: ${error.message}`,
        variant: 'destructive',
      });
      setConfirmingDelete(false);
    },
  });

  // Handle repository selection
  const toggleRepositorySelection = (fullName: string) => {
    if (selectedRepos.includes(fullName)) {
      setSelectedRepos(selectedRepos.filter((repo) => repo !== fullName));
    } else {
      setSelectedRepos([...selectedRepos, fullName]);
    }
  };

  // Process repositories for batch actions
  const getSelectedRepositories = () => {
    if (!repoStats) return [];

    const selected = [];
    const repos = repoStats.repositories[activeTab] || [];

    for (const repo of repos) {
      if (selectedRepos.includes(repo.full_name)) {
        const [owner, repoName] = repo.full_name.split('/');
        selected.push({ owner, repo: repoName });
      }
    }

    return selected;
  };

  // Handle archive action
  const handleArchiveSelected = () => {
    const repositories = getSelectedRepositories();
    if (repositories.length === 0) {
      toast({
        title: 'Selection Required',
        description: 'Please select at least one repository to archive',
      });
      return;
    }

    archiveMutation.mutate(repositories);
  };

  // Handle delete action
  const handleDeleteSelected = () => {
    const repositories = getSelectedRepositories();
    if (repositories.length === 0) {
      toast({
        title: 'Selection Required',
        description: 'Please select at least one repository to delete',
      });
      return;
    }

    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    deleteMutation.mutate(repositories);
  };

  // Handle cancel delete
  const handleCancelDelete = () => {
    setConfirmingDelete(false);
  };

  // Format date 
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate time ago string
  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
      return interval === 1 ? '1 year ago' : `${interval} years ago`;
    }
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
      return interval === 1 ? '1 month ago' : `${interval} months ago`;
    }
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
      return interval === 1 ? '1 day ago' : `${interval} days ago`;
    }
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
      return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
    }
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
      return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
    }
    
    return 'just now';
  };

  // Determine color for activity score
  const getActivityColor = (score: number) => {
    if (score > 70) return 'bg-green-500/10 text-green-500';
    if (score > 30) return 'bg-yellow-500/10 text-yellow-500';
    return 'bg-red-500/10 text-red-500';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Repository Manager
          </CardTitle>
          <CardDescription>Loading repositories...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Repository Manager
          </CardTitle>
          <CardDescription>Error loading repositories</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {String(error)}
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2" 
                onClick={() => refetch()}
              >
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          GitHub Repository Manager
        </CardTitle>
        <CardDescription>
          Manage and clean up your GitHub repositories
        </CardDescription>

        {/* Repository Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active</p>
                  <h3 className="text-2xl font-bold">{repoStats?.active || 0}</h3>
                </div>
                <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Inactive</p>
                  <h3 className="text-2xl font-bold">{repoStats?.inactive || 0}</h3>
                </div>
                <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dormant</p>
                  <h3 className="text-2xl font-bold">{repoStats?.dormant || 0}</h3>
                </div>
                <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs 
          defaultValue="dormant" 
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'active' | 'inactive' | 'dormant')}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="active" className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              Active ({repoStats?.active || 0})
            </TabsTrigger>
            <TabsTrigger value="inactive" className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              Inactive ({repoStats?.inactive || 0})
            </TabsTrigger>
            <TabsTrigger value="dormant" className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              Dormant ({repoStats?.dormant || 0})
            </TabsTrigger>
          </TabsList>
          
          {['active', 'inactive', 'dormant'].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-0">
              {confirmingDelete && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Confirm Deletion</AlertTitle>
                  <AlertDescription>
                    Are you sure you want to permanently delete {selectedRepos.length} repositories?
                    This action cannot be undone.
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="sm" 
                        onClick={handleDeleteSelected}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCancelDelete}
                        disabled={deleteMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-muted-foreground">
                  {selectedRepos.length} repositories selected
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleArchiveSelected}
                    disabled={archiveMutation.isPending || deleteMutation.isPending || selectedRepos.length === 0}
                    className="flex items-center gap-1"
                  >
                    <Archive className="h-4 w-4" />
                    {archiveMutation.isPending ? 'Archiving...' : 'Archive Selected'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelected}
                    disabled={archiveMutation.isPending || deleteMutation.isPending || selectedRepos.length === 0}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    {confirmingDelete ? 'Confirm Delete' : 'Delete Selected'}
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="h-[400px] rounded-md border">
                {repoStats?.repositories[tab as keyof typeof repoStats.repositories]?.length ? (
                  <div className="space-y-2 p-2">
                    {repoStats.repositories[tab as keyof typeof repoStats.repositories]?.map((repo) => (
                      <Card key={repo.id} className={`relative hover:shadow-md transition-all duration-200 ${selectedRepos.includes(repo.full_name) ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
                        <CardContent className="p-4">
                          <div className="absolute right-4 top-4">
                            <Switch
                              checked={selectedRepos.includes(repo.full_name)}
                              onCheckedChange={() => toggleRepositorySelection(repo.full_name)}
                            />
                          </div>
                          
                          <div className="pr-12">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{repo.name}</h3>
                              <Badge variant="outline" className="text-xs">
                                {repo.visibility}
                              </Badge>
                              {repo.archived && (
                                <Badge variant="secondary" className="text-xs">
                                  archived
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              {repo.description || 'No description provided'}
                            </p>
                            
                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                {repo.stargazers_count}
                              </div>
                              <div className="flex items-center gap-1">
                                <GitFork className="h-3 w-3" />
                                {repo.forks_count}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {repo.watchers_count}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Last updated: {repo.pushed_at ? timeAgo(repo.pushed_at) : 'Never'}
                              </div>
                              <div className="flex items-center gap-1">
                                <Info className="h-3 w-3" />
                                Created: {formatDate(repo.created_at)}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-3">
                              <Badge variant="outline" className={`${getActivityColor(repo.activity_score)}`}>
                                Score: {repo.activity_score}
                              </Badge>
                              <a
                                href={`https://github.com/${repo.full_name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View on GitHub
                              </a>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                    <Info className="h-12 w-12 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-medium">No {tab} repositories found</h3>
                    <p className="text-sm text-muted-foreground">
                      All your {tab} repositories will appear here
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <div className="text-xs text-muted-foreground">
          {repoStats?.total || 0} total repositories
        </div>
      </CardFooter>
    </Card>
  );
}