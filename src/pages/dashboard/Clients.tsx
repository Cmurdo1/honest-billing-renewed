import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useProAccess } from "@/hooks/useProAccess";
import { Badge } from "@/components/ui/badge";

const sb = supabase as any;

const FREE_CLIENT_LIMIT = 5;
// Use environment variable for Stripe checkout URL
const STRIPE_CHECKOUT_URL = import.meta.env.VITE_STRIPE_CHECKOUT_URL;

const Clients = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { isPro, isLoading: subLoading } = useProAccess();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");

  const clients = useQuery({
    queryKey: ["clients", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb
        .from("clients")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const limitReached = !isPro && !!clients.data && clients.data.length >= FREE_CLIENT_LIMIT;

  const addClient = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!isPro) {
        // Re-check limit on mutation to avoid races
        const { count, error: countError } = await sb
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);
        if (countError) throw countError;
        if ((count ?? 0) >= FREE_CLIENT_LIMIT) {
          throw new Error("Free plan limit reached. Upgrade to Pro for unlimited clients.");
        }
      }

      const payload = {
        user_id: user.id,
        name,
        email: email || null,
        company: company || null,
        address: address || null,
      };
      const { error } = await sb.from("clients").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients", user?.id] });
      setName("");
      setEmail("");
      setCompany("");
      setAddress("");
      toast.success("Client added");
    },
    onError: (e: any) => toast.error(e.message || "Failed to add client"),
  });

  return (
    <section className="space-y-6">
      {!subLoading && limitReached && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">Free Plan</Badge>
              <span>
                You reached the free limit of {FREE_CLIENT_LIMIT} clients.
                Upgrade to Pro for unlimited clients.
              </span>
            </div>
            <Button onClick={() => window.open(STRIPE_CHECKOUT_URL, "_blank")}>Upgrade</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add Client</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              addClient.mutate();
            }}
          >
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={addClient.isPending || limitReached}>Save Client</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.isLoading ? (
                <TableRow>
                  <TableCell colSpan={4}>Loading…</TableCell>
                </TableRow>
              ) : clients.data && clients.data.length > 0 ? (
                clients.data.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.email || "—"}</TableCell>
                    <TableCell>{c.company || "—"}</TableCell>
                    <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4}>No clients yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
};

export default Clients;
