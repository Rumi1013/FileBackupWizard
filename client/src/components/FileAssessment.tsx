import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, AlertTriangle, FileText, Coins, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { FileAssessment } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface FileAssessmentProps {
  filePath: string | null;
}

export function FileAssessment({ filePath }: FileAssessmentProps) {
  const { toast } = useToast();
  const [isAssessing, setIsAssessing] = useState(false);

  const { data: assessment, refetch } = useQuery<FileAssessment>({
    queryKey: ['/api/assessment', filePath],
    enabled: !!filePath,
  });

  const assessMutation = useMutation({
    mutationFn: async () => {
      if (!filePath) return;
      setIsAssessing(true);
      await apiRequest('POST', '/api/assess', { filePath });
      await refetch();
      setIsAssessing(false);
    },
    onSuccess: () => {
      toast({
        title: "Assessment Complete",
        description: "File has been assessed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Assessment Failed",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  if (!filePath) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 mb-2" />
          <p>Select a file to assess</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          File Assessment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              File: {filePath.split('/').pop()}
            </span>
            <Button
              onClick={() => assessMutation.mutate()}
              disabled={isAssessing}
              size="sm"
            >
              {isAssessing ? "Assessing..." : "Assess File"}
            </Button>
          </div>

          {assessment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Quality Score</h3>
                  <Badge 
                    variant={assessment.qualityScore === 'Good' ? 'default' : 'destructive'}
                  >
                    {assessment.qualityScore}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">File Type</h3>
                  <Badge variant="secondary">{assessment.fileType}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium">Monetization Status</span>
                </div>
                {assessment.monetizationEligible ? (
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle className="h-4 w-4" />
                    <span>Eligible for monetization</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>Not eligible for monetization</span>
                  </div>
                )}
              </div>

              {assessment.needsDeletion && (
                <div className="bg-destructive/10 p-4 rounded-md">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Marked for Deletion</span>
                  </div>
                  <p className="text-sm mt-2">
                    This file has been marked for deletion based on age or quality thresholds.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="font-medium">File Details</h3>
                <div className="text-sm space-y-1">
                  <p>Size: {Math.round(parseInt(assessment.size) / 1024)} KB</p>
                  <p>Last Modified: {new Date(assessment.lastModified).toLocaleDateString()}</p>
                  <p>Assessment Date: {new Date(assessment.assessmentDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
