
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { PlannerIntegration } from "@/components/PlannerIntegration";

export default function PlannerPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Midnight Magnolia Planner</h1>
        <p className="text-muted-foreground">Manage your schedules and tasks</p>
      </div>
      <PlannerIntegration />
    </div>
  );
}
