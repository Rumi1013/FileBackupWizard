import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Search, 
  FileText, 
  Code, 
  Hash,
  FileCode, 
  FileImage, 
  FileVideo,
  Check,
  Lightbulb,
  BarChart4, 
  ScrollText,
  BookOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ContentAnalysis, ContentSuggestion } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface ContentAnalyzerProps {
  filePath: string | null;
}

export function ContentAnalyzer({ filePath }: ContentAnalyzerProps) {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  const { data: analysis, refetch } = useQuery<ContentAnalysis>({
    queryKey: ['/api/analysis', filePath],
    enabled: !!filePath,
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!filePath) return;
      setIsAnalyzing(true);
      await apiRequest('POST', '/api/analyze', { filePath });
      await refetch();
      setIsAnalyzing(false);
    },
    onSuccess: () => {
      toast({
        title: "Analysis Complete",
        description: "Content has been analyzed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  // Get file type icon
  const getContentTypeIcon = (contentType: string) => {
    const type = contentType?.toLowerCase() || "";
    
    if (type.includes('code') || type.includes('script')) {
      return <FileCode className="h-6 w-6 text-green-500" />;
    }
    if (type.includes('image')) {
      return <FileImage className="h-6 w-6 text-blue-500" />;
    }
    if (type.includes('document') || type.includes('text')) {
      return <FileText className="h-6 w-6 text-amber-500" />;
    }
    if (type.includes('video')) {
      return <FileVideo className="h-6 w-6 text-purple-500" />;
    }
    return <FileText className="h-6 w-6 text-muted-foreground" />;
  };

  // Get readability color
  const getReadabilityColor = (score: string) => {
    switch (score) {
      case 'Good': return 'bg-green-500';
      case 'Moderate': return 'bg-amber-500';
      case 'Poor': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  // Get readability percentage
  const getReadabilityPercentage = (score: string) => {
    switch (score) {
      case 'Good': return 90;
      case 'Moderate': return 60;
      case 'Poor': return 30;
      default: return 0;
    }
  };

  // If no file is selected
  if (!filePath) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Search className="mx-auto h-12 w-12 mb-2" />
          <p>Select a file to analyze its content</p>
          <p className="text-sm mt-4">
            Content analysis provides insights on readability, key topics, and semantic organization.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get filename from path
  const fileName = filePath.split('/').pop() || '';

  // If loading while analyzing
  if (isAnalyzing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Search className="h-5 w-5" />
            Content Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32 space-y-3">
            <div className="h-2 w-24 bg-muted-foreground/20 rounded-full overflow-hidden relative">
              <div className="h-full bg-primary absolute left-0 transition-all duration-300 animate-pulse" style={{ width: "50%" }}></div>
            </div>
            <p className="text-muted-foreground">Analyzing content...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <span className="truncate max-w-[200px]">{fileName}</span>
            </CardTitle>
            <CardDescription>
              Content analysis and insights
            </CardDescription>
          </div>
          <Button
            onClick={() => analyzeMutation.mutate()}
            disabled={isAnalyzing}
            size="sm"
            variant="outline"
          >
            {isAnalyzing ? "Analyzing..." : "Analyze Content"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {analysis ? (
          <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="summary" className="text-xs">
                <ScrollText className="h-4 w-4 mr-1" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="text-xs">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Suggestions
              </TabsTrigger>
              <TabsTrigger value="organization" className="text-xs">
                <Lightbulb className="h-4 w-4 mr-1" />
                Organization
              </TabsTrigger>
            </TabsList>

            {/* Summary Tab */}
            <TabsContent value="summary">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/20 rounded-lg p-3 flex flex-col items-center">
                    {/* Readability circular indicator */}
                    <div className="relative h-20 w-20 mb-2">
                      <svg className="h-20 w-20" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="10"
                          strokeLinecap="round"
                          className="text-muted opacity-20"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray={`${getReadabilityPercentage(analysis.readabilityScore) * 2.83} 283`}
                          strokeDashoffset="0"
                          className={getReadabilityColor(analysis.readabilityScore)}
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Badge 
                          variant={analysis.readabilityScore === 'Good' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {analysis.readabilityScore}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-center">Readability</span>
                  </div>

                  <div className="bg-muted/20 rounded-lg p-3 flex flex-col items-center">
                    {getContentTypeIcon(analysis.contentType || 'Unknown')}
                    <span className="text-sm mt-2">{analysis.contentType || 'Unknown'}</span>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Content Overview
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {analysis.summary || 'No summary available for this content.'}
                  </p>
                </div>

                {analysis.keywords && (
                  <div className="space-y-2 mt-4">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Key Topics
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(analysis.keywords as string[]).map((keyword, index) => (
                        <Badge key={index} variant="outline" className="flex items-center gap-1 text-xs">
                          <Hash className="h-3 w-3" />
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Suggestions Tab */}
            <TabsContent value="suggestions">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Content Suggestions
                  </h3>
                  <div className="space-y-2">
                    {analysis.suggestions && (analysis.suggestions as ContentSuggestion[]).length > 0 ? (
                      (analysis.suggestions as ContentSuggestion[]).map((suggestion, index) => (
                        <div
                          key={index}
                          className={`bg-muted/20 p-3 rounded-lg space-y-1 border-l-4 ${
                            suggestion.priority === 'high' 
                              ? 'border-orange-500' 
                              : 'border-blue-500'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {suggestion.priority === 'high' ? (
                              <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                            ) : (
                              <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            )}
                            <span className="font-medium text-sm">{suggestion.suggestion}</span>
                          </div>
                          <p className="text-sm text-muted-foreground ml-6">
                            {suggestion.reason}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="bg-muted/20 p-4 rounded-lg text-center">
                        <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No suggestions available for this content.</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-muted/20 p-4 rounded-lg">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    AI-Generated Insights
                  </h3>
                  
                  <ul className="space-y-3">
                    {analysis.readabilityScore === 'Good' && (
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>This content has good readability, making it accessible to most users.</span>
                      </li>
                    )}
                    
                    {analysis.readabilityScore === 'Moderate' && (
                      <li className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                        <span>Consider simplifying complex sentences or breaking down long paragraphs.</span>
                      </li>
                    )}
                    
                    {analysis.readabilityScore === 'Poor' && (
                      <li className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                        <span>This content has poor readability. It might be too complex for general users.</span>
                      </li>
                    )}
                    
                    {analysis.contentType?.includes('Code') && (
                      <li className="flex items-start gap-2 text-sm">
                        <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                        <span>This is code content. Consider adding more comments to improve maintainability.</span>
                      </li>
                    )}
                    
                    {analysis.keywords && (analysis.keywords as string[]).length > 3 && (
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>This content covers multiple topics, making it a rich information source.</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* Organization Tab */}
            <TabsContent value="organization">
              <div className="space-y-4">
                <div className="bg-muted/20 p-4 rounded-lg">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Organization Tips
                  </h3>
                  
                  <ul className="space-y-2">
                    {analysis.organizationTips && (analysis.organizationTips as string[]).length > 0 ? (
                      (analysis.organizationTips as string[]).map((tip, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                          <span className="text-sm">{tip}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-center py-2 text-muted-foreground">
                        <p>No organization tips available for this content.</p>
                      </li>
                    )}
                  </ul>
                </div>
                
                <div className="bg-muted/20 p-4 rounded-lg">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    Organization Recommendations
                  </h3>
                  
                  <ul className="space-y-3">
                    {analysis.readabilityScore === 'Good' && (
                      <li className="flex items-start gap-2 text-sm">
                        <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5" />
                        <span>This high-quality content should be preserved in your knowledge base.</span>
                      </li>
                    )}
                    
                    {analysis.contentType?.includes('Code') && (
                      <li className="flex items-start gap-2 text-sm">
                        <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5" />
                        <span>Store in a code repository or developer documentation section.</span>
                      </li>
                    )}
                    
                    {analysis.contentType?.includes('Document') && (
                      <li className="flex items-start gap-2 text-sm">
                        <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5" />
                        <span>Organize in a documentation library with similar topics.</span>
                      </li>
                    )}
                    
                    {analysis.contentType?.includes('Image') && (
                      <li className="flex items-start gap-2 text-sm">
                        <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5" />
                        <span>Store in a media gallery with proper tagging based on visual content.</span>
                      </li>
                    )}
                    
                    {analysis.keywords && (analysis.keywords as string[]).length > 0 && (
                      <li className="flex items-start gap-2 text-sm">
                        <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5" />
                        <span>Tag with keywords for better searchability.</span>
                      </li>
                    )}
                    
                    {analysis.readabilityScore === 'Poor' && (
                      <li className="flex items-start gap-2 text-sm">
                        <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5" />
                        <span>Consider revising or summarizing this content to improve its usability.</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3" />
            <p>No analysis data available.</p>
            <p className="text-xs mt-2">Click "Analyze Content" to examine this file.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
