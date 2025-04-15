import React from 'react';
import { FileRecommendations } from '@/components/FileRecommendations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Lightbulb } from 'lucide-react';

export default function RecommendationsPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Sparkles className="h-6 w-6 mr-2 text-primary" />
              AI Recommendations
            </h1>
            <p className="text-muted-foreground">
              Get smart suggestions to improve your files
            </p>
          </div>
        </div>
        
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-xl">
              <Lightbulb className="h-5 w-5 mr-2 text-primary" />
              How Recommendations Work
            </CardTitle>
            <CardDescription>
              Our AI analyzes your files and provides personalized recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-card p-4">
                <h3 className="font-semibold mb-1">Quality Improvements</h3>
                <p className="text-sm text-muted-foreground">
                  Suggestions to enhance readability, formatting, and overall file quality. 
                  Perfect for documentation and content.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <h3 className="font-semibold mb-1">Organization</h3>
                <p className="text-sm text-muted-foreground">
                  Tips for better file structure, naming conventions, and directory organization. 
                  Helps reduce cognitive load and improve findability.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <h3 className="font-semibold mb-1">Monetization & Cleanup</h3>
                <p className="text-sm text-muted-foreground">
                  Identify files with monetization potential or files that should be 
                  archived or removed to keep your system clean.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <FileRecommendations />
      </div>
    </div>
  );
}