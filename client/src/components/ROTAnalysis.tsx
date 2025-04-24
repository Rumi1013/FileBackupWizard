
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { BarChart, PieChart, FileWarning, Clock, UserCheck } from "lucide-react";

interface ROTMetrics {
  redundant: number;
  obsolete: number;
  trivial: number;
  totalFiles: number;
}

export function ROTAnalysis({ filePath }: { filePath: string }) {
  const [metrics, setMetrics] = useState<ROTMetrics>({
    redundant: 0,
    obsolete: 0,
    trivial: 0,
    totalFiles: 0
  });

  const [reviewerStatus, setReviewerStatus] = useState<{[key: string]: number}>({
    "Alice": 85,
    "Bob": 45,
    "Charlie": 65
  });

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="h-5 w-5" />
          ROT Analysis Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Redundant</h3>
              <Badge variant="destructive">{metrics.redundant}%</Badge>
            </div>
            <Progress value={metrics.redundant} className="mt-2" />
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Obsolete</h3>
              <Badge variant="warning">{metrics.obsolete}%</Badge>
            </div>
            <Progress value={metrics.obsolete} className="mt-2" />
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Trivial</h3>
              <Badge variant="default">{metrics.trivial}%</Badge>
            </div>
            <Progress value={metrics.trivial} className="mt-2" />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Reviewer Progress
          </h3>
          {Object.entries(reviewerStatus).map(([reviewer, progress]) => (
            <div key={reviewer} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{reviewer}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
