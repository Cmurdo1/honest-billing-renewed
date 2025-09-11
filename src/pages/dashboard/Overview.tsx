import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useProAccess } from "@/hooks/useProAccess";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, TrendingUp, Users, FileText, ArrowRight } from "lucide-react";

const sb = supabase as any;

const Overview = () => {
  const { user } = useAuth();
  const { isPro, isLoading: proLoading } = useProAccess();

  const clientsCount = useQuery({
    queryKey: ["clients-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await sb
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const invoicesCount = useQuery({
    queryKey: ["invoices-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await sb
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  return (
    <section className="space-y-6">
      {/* Subscription Status Banner */}
      {!proLoading && (
        <Card className={`border-2 ${isPro ? 'border-primary bg-primary/5' : 'border-accent bg-accent/10'}`}>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                {isPro ? (
                  <>
                    <Crown className="h-6 w-6 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-primary">Pro Account Active</h3>
                      <p className="text-sm text-muted-foreground">
                        Enjoy unlimited features and priority support
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Crown className="h-6 w-6 text-accent flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-accent">
                        Upgrade to Pro
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Unlock advanced features like custom branding, analytics, and PDF exports
                      </p>
                    </div>
                  </>
                )}
              </div>
              {!isPro && (
                <Button 
                  onClick={() => window.open("https://buy.stripe.com/aFaeVd2ub23leHdf3p7kc03", "_blank")}
                  className="flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  Upgrade Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clientsCount.isLoading ? "—" : clientsCount.data}
            </div>
            <p className="text-xs text-muted-foreground">
              Active client relationships
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoicesCount.isLoading ? "—" : invoicesCount.data}
            </div>
            <p className="text-xs text-muted-foreground">
              Invoices created
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pro Features Showcase */}
      {!isPro && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Pro Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-semibold mb-1">Advanced Analytics</h4>
                <p className="text-sm text-muted-foreground">
                  Detailed business insights and revenue tracking
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Crown className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-semibold mb-1">Custom Branding</h4>
                <p className="text-sm text-muted-foreground">
                  Add your logo and colors to invoices
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-semibold mb-1">PDF Export</h4>
                <p className="text-sm text-muted-foreground">
                  Export and send professional invoices
                </p>
              </div>
            </div>
            <div className="text-center mt-6">
              <Button 
                onClick={() => window.open("https://buy.stripe.com/aFaeVd2ub23leHdf3p7kc03", "_blank")}
                size="lg"
                className="flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <Crown className="h-4 w-4" />
                <span className="hidden sm:inline">Upgrade to Pro - $4.99/month</span>
                <span className="sm:hidden">Upgrade to Pro</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
};

export default Overview;
