import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useProAccess } from "@/hooks/useProAccess";
import { Download, Send, Crown } from "lucide-react";

const sb = supabase as any;

const Invoices = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { isPro } = useProAccess();

  const [number, setNumber] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [subtotal, setSubtotal] = useState("");
  const [tax, setTax] = useState("");
  const [status, setStatus] = useState("draft");
  const [dueDate, setDueDate] = useState<string>("");

  const clients = useQuery({
    queryKey: ["invoice-clients", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb
        .from("clients")
        .select("id,name")
        .eq("user_id", user!.id)
        .order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  const invoices = useQuery({
    queryKey: ["invoices", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb
        .from("invoices")
        .select("id, number, status, total, issue_date, due_date, client:clients(name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const addInvoice = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!clientId) throw new Error("Please choose a client");
      const total = Number(subtotal || 0) + Number(tax || 0);
      const { error } = await sb.from("invoices").insert([
        {
          user_id: user.id,
          client_id: clientId,
          number,
          status,
          issue_date: new Date().toISOString().slice(0, 10),
          due_date: dueDate || null,
          subtotal: Number(subtotal || 0),
          tax: Number(tax || 0),
          total,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", user?.id] });
      setNumber("");
      setClientId("");
      setSubtotal("");
      setTax("");
      setStatus("draft");
      setDueDate("");
      toast.success("Invoice created");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create invoice"),
  });

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              addInvoice.mutate();
            }}
          >
            <div>
              <Label htmlFor="number">Invoice #</Label>
              <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} required />
            </div>
            <div>
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.data?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="due">Due date</Label>
              <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="subtotal">Subtotal</Label>
              <Input id="subtotal" type="number" step="0.01" value={subtotal} onChange={(e) => setSubtotal(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tax">Tax</Label>
              <Input id="tax" type="number" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Button type="submit" disabled={addInvoice.isPending}>Create Invoice</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7}>Loading…</TableCell>
                </TableRow>
              ) : invoices.data && invoices.data.length > 0 ? (
                invoices.data.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.number}</TableCell>
                    <TableCell>{inv.client?.name ?? "—"}</TableCell>
                    <TableCell className="capitalize">{inv.status}</TableCell>
                    <TableCell>${Number(inv.total).toFixed(2)}</TableCell>
                    <TableCell>{inv.issue_date}</TableCell>
                    <TableCell>{inv.due_date || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline">Edit</Button>
                        {isPro ? (
                          <>
                            <Button size="sm" variant="secondary" className="flex items-center gap-1">
                              <Download className="h-3 w-3" />
                              PDF
                            </Button>
                            <Button size="sm" variant="default" className="flex items-center gap-1">
                              <Send className="h-3 w-3" />
                              Send
                            </Button>
                          </>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={() => window.open("https://buy.stripe.com/aFaeVd2ub23leHdf3p7kc03", "_blank")}
                            className="text-xs flex items-center gap-1"
                          >
                            <Crown className="h-3 w-3" />
                            Pro: Export
                          </Button>
                        )}
                        <Button size="sm" variant="destructive">Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7}>No invoices yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
};

export default Invoices;
