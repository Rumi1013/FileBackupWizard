import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  AlertCircle, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Coins, 
  Trash, 
  Award, 
  Clock, 
  BarChart4, 
  Calendar, 
  Info, 
  FileCode, 
  FileImage, 
  FileVideo, 
  ClipboardList
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { FileAssessment as FileAssessmentType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface FileAssessmentProps {
  filePath: string | null;
}

export function FileAssessment({ filePath }: FileAssessmentProps) {
  const { toast } = useToast();
  const [isAssessing, setIsAssessing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: assessment, refetch } = useQuery<FileAssessmentType>({
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

  const organizeMutation = useMutation({
    mutationFn: async () => {
      if (!filePath) return;
      await apiRequest('POST', '/api/organize', { filePath });
    },
    onSuccess: () => {
      toast({
        title: "Organization Complete",
        description: "File organization rules have been applied",
      });
    },
    onError: (error) => {
      toast({
        title: "Organization Failed",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  // Function to get file type icon
  const getFileTypeIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(ext => type.includes(ext))) {
      return <FileImage className="h-6 w-6 text-blue-500" />;
    }
    if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.html', '.css'].some(ext => type.includes(ext))) {
      return <FileCode className="h-6 w-6 text-green-500" />;
    }
    if (['.pdf', '.doc', '.docx', '.txt', '.md'].some(ext => type.includes(ext))) {
      return <FileText className="h-6 w-6 text-amber-500" />;
    }
    if (['.mp4', '.mov', '.avi', '.webm'].some(ext => type.includes(ext))) {
      return <FileVideo className="h-6 w-6 text-purple-500" />;
    }
    return <FileText className="h-6 w-6 text-muted-foreground" />;
  };

  // Function to get quality color
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'Good': return 'bg-green-500';
      case 'Moderate': return 'bg-amber-500';
      case 'Poor': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  // Get file score percentage based on quality score
  const getQualityPercentage = (quality: string) => {
    switch (quality) {
      case 'Good': return 90;
      case 'Moderate': return 60;
      case 'Poor': return 30;
      default: return 0;
    }
  };

  // Get file size in human readable format
  const formatFileSize = (sizeInBytes: string) => {
    const size = parseInt(sizeInBytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Format date in readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // If no file is selected
  if (!filePath) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 mb-2" />
          <p>Select a file to assess</p>
          <p className="text-sm mt-4">
            File assessment provides insights on quality, monetization eligibility, and organization recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get filename from path
  const fileName = filePath.split('/').pop() || '';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                {assessment && getFileTypeIcon(assessment.fileType)}
                <span className="truncate max-w-[200px]">{fileName}</span>
              </CardTitle>
              <CardDescription>
                File assessment and organization
              </CardDescription>
            </div>
            <Button
              onClick={() => assessMutation.mutate()}
              disabled={isAssessing}
              size="sm"
              variant="outline"
            >
              {isAssessing ? "Assessing..." : "Assess File"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assessment ? (
            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="overview" className="text-xs">
                  <BarChart4 className="h-4 w-4 mr-1" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="quality" className="text-xs">
                  <Award className="h-4 w-4 mr-1" />
                  Quality Metrics
                </TabsTrigger>
                <TabsTrigger value="actions" className="text-xs">
                  <ClipboardList className="h-4 w-4 mr-1" />
                  Recommendations
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/20 rounded-lg p-3 flex flex-col items-center">
                    {/* Quality score circular indicator */}
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
                          strokeDasharray={`${getQualityPercentage(assessment.qualityScore) * 2.83} 283`}
                          strokeDashoffset="0"
                          className={getQualityColor(assessment.qualityScore)}
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Badge 
                          variant={assessment.qualityScore === 'Good' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {assessment.qualityScore}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-center">Quality Score</span>
                  </div>

                  <div className="bg-muted/20 rounded-lg p-3 flex flex-col items-center">
                    {assessment.monetizationEligible ? (
                      <>
                        <Coins className="h-16 w-16 text-yellow-500 mb-2" />
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 text-xs border-green-500">
                          Monetizable
                        </Badge>
                      </>
                    ) : (
                      <>
                        <Coins className="h-16 w-16 text-muted-foreground mb-2 opacity-50" />
                        <Badge variant="outline" className="text-xs">
                          Not Monetizable
                        </Badge>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      File Type
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {assessment.fileType}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium flex items-center gap-1">
                      <Info className="h-4 w-4" />
                      Size
                    </h3>
                    <span className="text-xs">{formatFileSize(assessment.size)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Last Modified
                    </h3>
                    <span className="text-xs">{formatDate(assessment.lastModified)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Assessment Date
                    </h3>
                    <span className="text-xs">{formatDate(assessment.assessmentDate)}</span>
                  </div>
                </div>

                {assessment.needsDeletion && (
                  <div className="bg-destructive/10 p-3 rounded-md mt-4">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-medium">Deletion Candidate</span>
                    </div>
                    <p className="text-xs mt-2 text-destructive/80">
                      This file has been flagged for deletion due to age, quality, or duplicate content.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Quality Metrics Tab */}
              <TabsContent value="quality" className="space-y-4">
                {assessment.metadata && (
                  <div className="space-y-4">
                    {assessment.metadata.codeQuality && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                          <FileCode className="h-4 w-4" />
                          Code Quality Metrics
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span>Linting</span>
                              <span>{(assessment.metadata.codeQuality.lintingScore * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={assessment.metadata.codeQuality.lintingScore * 100} className="h-1" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span>Complexity</span>
                              <span>{(assessment.metadata.codeQuality.complexity * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={assessment.metadata.codeQuality.complexity * 100} className="h-1" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span>Documentation</span>
                              <span>{(assessment.metadata.codeQuality.documentation * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={assessment.metadata.codeQuality.documentation * 100} className="h-1" />
                          </div>
                        </div>
                      </div>
                    )}

                    {assessment.metadata.documentQuality && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Document Quality Metrics
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span>Readability</span>
                              <span>{(assessment.metadata.documentQuality.readability * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={assessment.metadata.documentQuality.readability * 100} className="h-1" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span>Formatting</span>
                              <span>{(assessment.metadata.documentQuality.formatting * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={assessment.metadata.documentQuality.formatting * 100} className="h-1" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span>Completeness</span>
                              <span>{(assessment.metadata.documentQuality.completeness * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={assessment.metadata.documentQuality.completeness * 100} className="h-1" />
                          </div>
                        </div>
                      </div>
                    )}

                    {assessment.metadata.imageQuality && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                          <FileImage className="h-4 w-4" />
                          Image Quality Metrics
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span>Resolution</span>
                              <span>{(assessment.metadata.imageQuality.resolution * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={assessment.metadata.imageQuality.resolution * 100} className="h-1" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span>Color Profile</span>
                              <span>{assessment.metadata.imageQuality.colorProfile}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span>Compression</span>
                              <span>{(assessment.metadata.imageQuality.compression * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={assessment.metadata.imageQuality.compression * 100} className="h-1" />
                          </div>
                        </div>
                      </div>
                    )}

                    {assessment.metadata.videoQuality && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                          <FileVideo className="h-4 w-4" />
                          Video Quality Metrics
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span>Resolution</span>
                              <span>{assessment.metadata.videoQuality.resolution}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span>Bitrate</span>
                              <span>{assessment.metadata.videoQuality.bitrate} Mbps</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span>Duration</span>
                              <span>{assessment.metadata.videoQuality.duration} sec</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {!assessment.metadata.codeQuality && 
                     !assessment.metadata.documentQuality && 
                     !assessment.metadata.imageQuality && 
                     !assessment.metadata.videoQuality && (
                      <div className="text-center py-6 text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                        <p>No detailed quality metrics available for this file type.</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Actions Tab */}
              <TabsContent value="actions" className="space-y-4">
                <div className="bg-muted/20 p-4 rounded-lg">
                  <h3 className="text-sm font-medium mb-3">Recommended Actions</h3>
                  
                  <ul className="space-y-2">
                    {assessment.monetizationEligible && (
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>This file is eligible for monetization. Consider adding it to your monetization pipeline.</span>
                      </li>
                    )}
                    
                    {assessment.needsDeletion && (
                      <li className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                        <span>This file is a candidate for deletion. Consider removing it to save storage space.</span>
                      </li>
                    )}
                    
                    {assessment.qualityScore === 'Poor' && (
                      <li className="flex items-start gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                        <span>This file has poor quality. Consider improving or replacing it.</span>
                      </li>
                    )}
                    
                    {assessment.qualityScore === 'Moderate' && (
                      <li className="flex items-start gap-2 text-sm">
                        <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                        <span>This file has moderate quality. There's room for improvement.</span>
                      </li>
                    )}
                    
                    {assessment.qualityScore === 'Good' && !assessment.needsDeletion && (
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>This file has good quality. No immediate action needed.</span>
                      </li>
                    )}
                  </ul>
                </div>

                <Button
                  onClick={() => organizeMutation.mutate()}
                  disabled={organizeMutation.isPending}
                  className="w-full"
                >
                  Apply Organization Rules
                </Button>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No assessment data available.</p>
              <p className="text-xs mt-2">Click "Assess File" to analyze this file.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
