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

  const downloadPDF = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId },
      });

      if (error) throw error;

      // The function now returns HTML, so we open it in a new tab
      const blob = new Blob([data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success("Invoice opened in new tab. Use Print to save as PDF.");

    } catch (error: any) {
      console.error('PDF generation error:', error);
      toast.error("Failed to generate PDF");
    }
  };

  const sendInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await supabase.functions.invoke('send-invoice-email', {
        body: { invoiceId }
      });
      
      if (response.error) throw response.error;
      
      toast.success(`Invoice ${invoiceNumber} sent successfully`);
    } catch (error: any) {
      console.error('Email sending error:', error);
      toast.error("Failed to send invoice");
    }
  };

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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[80px]">#</TableHead>
                  <TableHead className="min-w-[120px]">Client</TableHead>
                  <TableHead className="min-w-[80px]">Status</TableHead>
                  <TableHead className="min-w-[80px]">Total</TableHead>
                  <TableHead className="min-w-[100px]">Issued</TableHead>
                  <TableHead className="min-w-[100px]">Due</TableHead>
                  <TableHead className="min-w-[200px]">Actions</TableHead>
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
                      <TableCell className="font-medium text-sm">{inv.number}</TableCell>
                      <TableCell className="text-sm">{inv.client?.name ?? "—"}</TableCell>
                      <TableCell className="capitalize text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                          inv.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                          inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {inv.status}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-sm">${Number(inv.total).toFixed(2)}</TableCell>
                      <TableCell className="text-sm">{inv.issue_date}</TableCell>
                      <TableCell className="text-sm">{inv.due_date || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Button size="sm" variant="outline" className="text-xs px-2">Edit</Button>
                          {isPro ? (
                            <>
                              <Button 
                                size="sm" 
                                variant="secondary" 
                                className="flex items-center gap-1 text-xs px-2"
                                onClick={() => downloadPDF(inv.id)}
                              >
                                <Download className="h-3 w-3" />
                                <span className="hidden sm:inline">PDF</span>
                              </Button>
                              <Button 
                                size="sm" 
                                variant="default" 
                                className="flex items-center gap-1 text-xs px-2"
                                onClick={() => sendInvoice(inv.id, inv.number)}
                              >
                                <Send className="h-3 w-3" />
                                <span className="hidden sm:inline">Send</span>
                              </Button>
                            </>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              onClick={() => window.open("https://buy.stripe.com/aFaeVd2ub23leHdf3p7kc03", "_blank")}
                              className="text-xs flex items-center gap-1 px-2"
                            >
                              <Crown className="h-3 w-3" />
                              <span className="hidden sm:inline">Pro</span>
                            </Button>
                          )}
                          <Button size="sm" variant="destructive" className="text-xs px-2">
                            <span className="hidden sm:inline">Delete</span>
                            <span className="sm:hidden">×</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No invoices yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default Invoices;
