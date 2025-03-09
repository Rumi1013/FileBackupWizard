import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ContentAnalysis, ContentSuggestion } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface ContentAnalyzerProps {
  filePath: string | null;
}

export function ContentAnalyzer({ filePath }: ContentAnalyzerProps) {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  if (!filePath) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Info className="mx-auto h-12 w-12 mb-2" />
          <p>Select a file to analyze</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Content Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              File: {filePath.split('/').pop()}
            </span>
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={isAnalyzing}
              size="sm"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze"}
            </Button>
          </div>

          {analysis && (
            <>
              <div className="space-y-2">
                <h3 className="font-medium">Readability Score</h3>
                <Badge variant="secondary">{analysis.readabilityScore}</Badge>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Suggestions</h3>
                <div className="space-y-2">
                  {(analysis.suggestions as ContentSuggestion[]).map((suggestion, index) => (
                    <div
                      key={index}
                      className="bg-muted p-3 rounded-lg space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        {suggestion.priority === 'high' ? (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        ) : (
                          <Info className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="font-medium">{suggestion.suggestion}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {suggestion.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Organization Tips</h3>
                <ul className="space-y-1">
                  {(analysis.organizationTips as string[]).map((tip, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
