import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Log } from "@shared/schema";

export function LogViewer() {
  const { data: logs, isLoading } = useQuery<Log[]>({
    queryKey: ['/api/logs'],
    refetchInterval: 2000
  });

  if (isLoading) {
    return <div>Loading logs...</div>;
  }

  return (
    <ScrollArea className="h-[400px] rounded-md border p-4">
      {logs?.map((log) => (
        <div
          key={log.id}
          className={`mb-2 text-sm ${
            log.level === 'error' ? 'text-destructive' : 
            log.level === 'warning' ? 'text-yellow-600' : 
            'text-foreground'
          }`}
        >
          <span className="font-mono text-xs text-muted-foreground">
            {new Date(log.timestamp).toLocaleTimeString()}
          </span>
          {' '}
          <span className="font-semibold">[{log.level.toUpperCase()}]</span>
          {' '}
          {log.message}
        </div>
      ))}
    </ScrollArea>
  );
}
