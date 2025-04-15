import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import PreviewPage from "./pages/PreviewPage";
import RecommendationsPage from "./pages/RecommendationsPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/preview" component={PreviewPage} />
      <Route path="/recommendations" component={RecommendationsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
