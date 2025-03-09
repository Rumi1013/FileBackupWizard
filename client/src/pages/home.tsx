import { FileManager } from "@/components/FileManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="mx-auto max-w-7xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">File Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <FileManager />
        </CardContent>
      </Card>
    </div>
  );
}
