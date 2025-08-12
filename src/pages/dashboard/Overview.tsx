import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const sb = supabase as any;

const Overview = () => {
  const { user } = useAuth();

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
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Total Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">
            {clientsCount.isLoading ? "—" : clientsCount.data}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">
            {invoicesCount.isLoading ? "—" : invoicesCount.data}
          </p>
        </CardContent>
      </Card>
    </section>
  );
};

export default Overview;
