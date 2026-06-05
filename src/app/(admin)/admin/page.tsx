import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, IndianRupee, ShoppingBag, Users } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tighter uppercase">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-none border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Total Revenue
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹45,231.89</div>
            <p className="text-xs text-muted-foreground mt-1">+20.1% from last month</p>
          </CardContent>
        </Card>
        
        <Card className="rounded-none border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Orders
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+235</div>
            <p className="text-xs text-muted-foreground mt-1">+180.1% from last month</p>
          </CardContent>
        </Card>
        
        <Card className="rounded-none border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">124</div>
            <p className="text-xs text-muted-foreground mt-1">+12 new this week</p>
          </CardContent>
        </Card>
        
        <Card className="rounded-none border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Active Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+573</div>
            <p className="text-xs text-muted-foreground mt-1">+201 since last hour</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Mock Chart Area */}
      <Card className="rounded-none border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center bg-muted/50 border border-border/50 mx-6 mb-6">
          <span className="text-muted-foreground text-sm uppercase tracking-widest">Chart Placeholder</span>
        </CardContent>
      </Card>
    </div>
  );
}
