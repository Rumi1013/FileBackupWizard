
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Package, Calendar, FileText, Users } from "lucide-react";

export function PlannerIntegration() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-serif flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Midnight Magnolia Planner
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input 
            placeholder="Search inventory, content, or orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="inventory">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="inventory">
              <Package className="h-4 w-4 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="content">
              <FileText className="h-4 w-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="orders">
              <Users className="h-4 w-4 mr-2" />
              Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Inventory Items */}
              {["Journals", "Tarot Decks", "Digital Planners"].map((item) => (
                <Card key={item} className="p-4 hover:bg-accent/5 cursor-pointer">
                  <h3 className="font-medium">{item}</h3>
                  <p className="text-sm text-muted-foreground">5 in stock</p>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Content Items */}
              {["Monthly Journal Prompts", "Seasonal Rituals", "Affirmations"].map((item) => (
                <Card key={item} className="p-4 hover:bg-accent/5 cursor-pointer">
                  <h3 className="font-medium">{item}</h3>
                  <p className="text-sm text-muted-foreground">Evergreen Content</p>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Order Items */}
              {["Client Discovery Call", "Brand Strategy Session", "Content Calendar"].map((item) => (
                <Card key={item} className="p-4 hover:bg-accent/5 cursor-pointer">
                  <h3 className="font-medium">{item}</h3>
                  <p className="text-sm text-muted-foreground">Upcoming</p>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
