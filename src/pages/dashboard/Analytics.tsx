import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Users, FileText, Calendar } from "lucide-react";
import ProFeatureGate from "@/components/ProFeatureGate";

const Analytics = () => {
  const { user } = useAuth();

  const analyticsData = useQuery({
    queryKey: ["analytics", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [clientsResult, invoicesResult, revenueResult] = await Promise.all([
        supabase
          .from("clients")
          .select("created_at")
          .eq("user_id", user!.id),
        supabase
          .from("invoices")
          .select("total, status, created_at, due_date")
          .eq("user_id", user!.id),
        supabase
          .from("invoices")
          .select("total")
          .eq("user_id", user!.id)
          .eq("status", "paid")
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (invoicesResult.error) throw invoicesResult.error;
      if (revenueResult.error) throw revenueResult.error;

      const clients = clientsResult.data || [];
      const invoices = invoicesResult.data || [];
      const paidInvoices = revenueResult.data || [];

      const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const pendingRevenue = invoices
        .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
        .reduce((sum, inv) => sum + (inv.total || 0), 0);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const recentClients = clients.filter(
        client => new Date(client.created_at) >= thirtyDaysAgo
      ).length;

      const recentInvoices = invoices.filter(
        invoice => new Date(invoice.created_at) >= thirtyDaysAgo
      ).length;

      const overdueInvoices = invoices.filter(invoice => {
        return invoice.due_date && 
               new Date(invoice.due_date) < now && 
               (invoice.status === 'sent' || invoice.status === 'draft');
      }).length;

      return {
        totalRevenue,
        pendingRevenue,
        recentClients,
        recentInvoices,
        overdueInvoices,
        totalClients: clients.length,
        totalInvoices: invoices.length,
        paidInvoices: paidInvoices.length
      };
    },
  });

  return (
    <ProFeatureGate 
      featureName="Advanced Analytics" 
      description="Get detailed insights into your business performance, revenue trends, and client analytics."
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Business Analytics</h2>
          <Badge variant="secondary" className="ml-2">Pro Feature</Badge>
        </div>

        {analyticsData.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {/* Revenue Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                    ${analyticsData.data?.totalRevenue?.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-500">
                    From {analyticsData.data?.paidInvoices || 0} paid invoices
                  </p>
                </CardContent>
              </Card>

              <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Revenue</CardTitle>
                  <Calendar className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                    ${analyticsData.data?.pendingRevenue?.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-xs text-yellow-600 dark:text-yellow-500">
                    Awaiting payment
                  </p>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
                  <FileText className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                    {analyticsData.data?.overdueInvoices || 0}
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-500">
                    Need attention
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Activity Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">New Clients (30 days)</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.data?.recentClients || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Total: {analyticsData.data?.totalClients || 0} clients
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">New Invoices (30 days)</CardTitle>
                  <FileText className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.data?.recentInvoices || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Total: {analyticsData.data?.totalInvoices || 0} invoices
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsData.data?.totalInvoices ? 
                      Math.round((analyticsData.data.paidInvoices / analyticsData.data.totalInvoices) * 100) 
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Invoices paid on time
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </ProFeatureGate>
  );
};

export default Analytics;