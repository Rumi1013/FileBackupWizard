import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle, AlertCircle, CheckCheck, ThumbsUp, ThumbsDown, ChevronRight, ChevronDown, FileText, FolderTree } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type RecommendationType = 'quality_improvement' | 'organization' | 'monetization' | 'deletion';

interface FileRecommendation {
  id: string;
  file_id: string;
  recommendation_type: RecommendationType;
  recommendation_text: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  implemented: boolean;
  metadata?: Record<string, any>;
}

interface RecommendationFeedback {
  id: string;
  recommendationId: string;
  helpful: boolean;
  feedbackText: string | null;
  createdAt: string;
}

export function FileRecommendations() {
  const queryClient = useQueryClient();
  const [filePath, setFilePath] = useState('');
  const [dirPath, setDirPath] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTab, setSelectedTab] = useState<RecommendationType | 'all'>('all');
  
  // Query to get recommendations for a file
  const { data: recommendations, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/recommendations/file', encodeURIComponent(filePath)],
    queryFn: async () => {
      if (!filePath) return [];
      const response = await fetch(`/api/recommendations/file/${encodeURIComponent(filePath)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }
      return response.json();
    },
    enabled: !!filePath,
  });
  
  // Mutation to generate recommendations for a file
  const generateMutation = useMutation({
    mutationFn: async (path: string) => {
      setIsGenerating(true);
      const response = await fetch('/api/recommendations/generate', {
        method: 'POST',
        body: JSON.stringify({ filePath: path }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate recommendations');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations/file', encodeURIComponent(filePath)] });
      toast({
        title: 'Recommendations Generated',
        description: 'AI has successfully generated recommendations for this file.',
        variant: 'default',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error Generating Recommendations',
        description: `${error}`,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsGenerating(false);
    }
  });
  
  // Mutation to generate directory recommendations
  const generateDirMutation = useMutation({
    mutationFn: async (path: string) => {
      setIsGenerating(true);
      const response = await fetch('/api/recommendations/directory', {
        method: 'POST',
        body: JSON.stringify({ dirPath: path }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate directory recommendations');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Directory Recommendations Generated',
        description: `${data.length || 0} recommendations were generated for the directory.`,
        variant: 'default',
      });
      setFilePath(dirPath);
    },
    onError: (error) => {
      toast({
        title: 'Error Generating Directory Recommendations',
        description: `${error}`,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsGenerating(false);
    }
  });
  
  // Mutation to mark a recommendation as implemented
  const implementMutation = useMutation({
    mutationFn: async ({ id, implemented }: { id: string, implemented: boolean }) => {
      const response = await fetch(`/api/recommendations/${id}/implement`, {
        method: 'PATCH',
        body: JSON.stringify({ implemented }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Failed to update recommendation');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations/file', encodeURIComponent(filePath)] });
      toast({
        title: 'Recommendation Updated',
        description: 'Implementation status has been updated.',
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error Updating Recommendation',
        description: `${error}`,
        variant: 'destructive',
      });
    },
  });
  
  // Mutation to provide feedback on a recommendation
  const feedbackMutation = useMutation({
    mutationFn: async ({ id, helpful }: { id: string, helpful: boolean }) => {
      const response = await fetch(`/api/recommendations/${id}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ helpful, feedbackText: null }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Feedback Submitted',
        description: 'Thank you for your feedback!',
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error Submitting Feedback',
        description: `${error}`,
        variant: 'destructive',
      });
    },
  });
  
  // Handle file recommendation generation
  const handleGenerateRecommendations = () => {
    if (!filePath) {
      toast({
        title: 'Input Required',
        description: 'Please enter a file path',
        variant: 'destructive',
      });
      return;
    }
    
    generateMutation.mutate(filePath);
  };
  
  // Handle directory recommendation generation
  const handleGenerateDirectoryRecommendations = () => {
    if (!dirPath) {
      toast({
        title: 'Input Required',
        description: 'Please enter a directory path',
        variant: 'destructive',
      });
      return;
    }
    
    generateDirMutation.mutate(dirPath);
  };
  
  // Filter recommendations by type
  const filteredRecommendations = recommendations?.filter((rec: FileRecommendation) => 
    selectedTab === 'all' || rec.recommendation_type === selectedTab
  );
  
  // Get count by type
  const getCountByType = (type: RecommendationType | 'all') => {
    if (type === 'all') return recommendations?.length || 0;
    return recommendations?.filter((rec: FileRecommendation) => rec.recommendation_type === type).length || 0;
  };
  
  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 hover:bg-green-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };
  
  // Get type color and icon
  const getTypeDetails = (type: RecommendationType) => {
    switch (type) {
      case 'quality_improvement':
        return { color: 'bg-blue-100 text-blue-800 hover:bg-blue-200', label: 'Quality' };
      case 'organization':
        return { color: 'bg-purple-100 text-purple-800 hover:bg-purple-200', label: 'Organization' };
      case 'monetization':
        return { color: 'bg-green-100 text-green-800 hover:bg-green-200', label: 'Monetization' };
      case 'deletion':
        return { color: 'bg-red-100 text-red-800 hover:bg-red-200', label: 'Deletion' };
      default:
        return { color: 'bg-gray-100 text-gray-800 hover:bg-gray-200', label: 'Unknown' };
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* File Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>File Recommendations</CardTitle>
            <CardDescription>
              Get AI-powered recommendations for a specific file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter file path (e.g., ./sample-test-file.txt)"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleGenerateRecommendations} 
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Directory Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Directory Recommendations</CardTitle>
            <CardDescription>
              Get AI-powered recommendations for organizing a directory
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter directory path (e.g., ./client)"
                value={dirPath}
                onChange={(e) => setDirPath(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleGenerateDirectoryRecommendations} 
                disabled={isGenerating}
                variant="outline"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <FolderTree className="mr-2 h-4 w-4" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recommendations Display */}
      <Card>
        <CardHeader className="border-b pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Recommendations</CardTitle>
            <Tabs
              defaultValue="all"
              value={selectedTab}
              onValueChange={value => setSelectedTab(value as RecommendationType | 'all')}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-5 sm:w-auto">
                <TabsTrigger value="all">
                  All ({getCountByType('all')})
                </TabsTrigger>
                <TabsTrigger value="quality_improvement">
                  Quality ({getCountByType('quality_improvement')})
                </TabsTrigger>
                <TabsTrigger value="organization">
                  Organize ({getCountByType('organization')})
                </TabsTrigger>
                <TabsTrigger value="monetization">
                  Monetize ({getCountByType('monetization')})
                </TabsTrigger>
                <TabsTrigger value="deletion">
                  Remove ({getCountByType('deletion')})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-muted-foreground">An error occurred while fetching recommendations</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          ) : !recommendations || recommendations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-2">No recommendations available</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Enter a file path and click "Generate" to get AI-powered recommendations
                for improving your file quality, organization, and more.
              </p>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {filteredRecommendations?.map((recommendation: FileRecommendation) => {
                const typeDetails = getTypeDetails(recommendation.recommendation_type);
                return (
                  <AccordionItem 
                    value={recommendation.id} 
                    key={recommendation.id}
                    className="border p-2 rounded-md mb-3 hover:bg-muted/30 transition-colors"
                  >
                    <AccordionTrigger className="py-2 px-1 hover:no-underline">
                      <div className="flex items-center space-x-2 w-full text-left">
                        <Badge className={typeDetails.color}>
                          {typeDetails.label}
                        </Badge>
                        <Badge className={getPriorityColor(recommendation.priority)}>
                          {recommendation.priority}
                        </Badge>
                        {recommendation.implemented && (
                          <Badge variant="outline" className="border-green-300 text-green-700">
                            <CheckCheck className="h-3 w-3 mr-1" />
                            Implemented
                          </Badge>
                        )}
                        <span className="flex-1 font-medium mr-2">
                          {recommendation.recommendation_text.length > 100 
                            ? `${recommendation.recommendation_text.substring(0, 100)}...` 
                            : recommendation.recommendation_text}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pt-2 pb-1">
                      <div className="bg-muted/30 p-3 rounded-md mb-3">
                        <p className="text-sm mb-1 text-muted-foreground">
                          File: <span className="font-mono text-xs">{recommendation.file_id}</span>
                        </p>
                        <p className="text-sm">{recommendation.recommendation_text}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 justify-between items-center py-1">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => implementMutation.mutate({ 
                              id: recommendation.id, 
                              implemented: !recommendation.implemented 
                            })}
                            className={recommendation.implemented 
                              ? "border-orange-300 text-orange-700 hover:bg-orange-50" 
                              : "border-green-300 text-green-700 hover:bg-green-50"}
                          >
                            {recommendation.implemented 
                              ? "Mark as Not Implemented" 
                              : "Mark as Implemented"}
                          </Button>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => feedbackMutation.mutate({ id: recommendation.id, helpful: true })}
                            className="text-green-700 hover:bg-green-50 hover:text-green-800"
                          >
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            Helpful
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => feedbackMutation.mutate({ id: recommendation.id, helpful: false })}
                            className="text-red-700 hover:bg-red-50 hover:text-red-800"
                          >
                            <ThumbsDown className="h-4 w-4 mr-1" />
                            Not Helpful
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}