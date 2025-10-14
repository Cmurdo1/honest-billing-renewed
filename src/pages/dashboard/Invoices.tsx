import { useState, useMemo } from "react";
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
import { Download, Send, Crown, Trash } from "lucide-react";

const sb = supabase as any;

interface InvoiceItem {
  description: string;
  quantity: number | string;
  unit_price: number | string;
}

const Invoices = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { isPro } = useProAccess();

  const [number, setNumber] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [status, setStatus] = useState("draft");
  const [dueDate, setDueDate] = useState<string>("");
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", quantity: 1, unit_price: "" }]);
  const [taxRate, setTaxRate] = useState(""); // As a percentage

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

  const { subtotal, taxAmount, total } = useMemo(() => {
    const subtotal = items.reduce((acc, item) => {
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      return acc + quantity * price;
    }, 0);
    const tax = subtotal * (Number(taxRate) / 100);
    const total = subtotal + tax;
    return { subtotal, taxAmount: tax, total };
  }, [items, taxRate]);

  const addInvoice = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!clientId) throw new Error("Please choose a client");
      if (items.some(item => !item.description || !item.quantity || !item.unit_price)) {
        throw new Error("Please fill all item fields.");
      }

      const { data: invoiceData, error: invoiceError } = await sb.from("invoices").insert([
        {
          user_id: user.id,
          client_id: clientId,
          number,
          status,
          issue_date: new Date().toISOString().slice(0, 10),
          due_date: dueDate || null,
          subtotal: subtotal,
          tax: taxAmount,
          total: total,
        },
      ]).select();

      if (invoiceError) throw invoiceError;

      const invoiceId = invoiceData[0].id;
      const invoiceItems = items.map(item => ({
        invoice_id: invoiceId,
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
      }));

      const { error: itemsError } = await sb.from("invoice_items").insert(invoiceItems);

      if (itemsError) {
        // Attempt to clean up the created invoice if items fail to insert
        await sb.from("invoices").delete().eq("id", invoiceId);
        throw itemsError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", user?.id] });
      setNumber("");
      setClientId("");
      setItems([{ description: "", quantity: 1, unit_price: "" }]);
      setTaxRate("");
      setStatus("draft");
      setDueDate("");
      toast.success("Invoice created successfully");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create invoice"),
  });

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_price: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const downloadPDF = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId },
      });

      if (error) throw error;

      const blob = new Blob([data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success("Invoice opened in new tab. Use Print to save as PDF.");

    } catch (error: any) {
      console.error('PDF generation error:', error);
      toast.error("Failed to generate invoice: " + (error.message || 'Unknown error'));
    }
  };

  const sendInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('send-invoice-email', {
        body: { invoiceId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      
      if (response.error) throw response.error;
      
      toast.success(`Invoice ${invoiceNumber} sent successfully`);
    } catch (error: any) {
      console.error('Email sending error:', error);
      toast.error("Failed to send invoice: " + (error.message || 'Unknown error'));
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
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
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
              <Select value={clientId} onValueChange={setClientId} required>
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

            <div className="md:col-span-2 lg:col-span-3 space-y-4">
              <Label>Items</Label>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Input
                      placeholder="Item description"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, "description", e.target.value)}
                      className="w-full"
                      required
                    />
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", e.target.value ? Number(e.target.value) : "")}
                        className="w-1/2 sm:w-20"
                        min="1"
                        required
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Unit Price"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, "unit_price", e.target.value ? Number(e.target.value) : "")}
                        className="w-1/2 sm:w-28"
                        min="0"
                        required
                      />
                    </div>
                    <Button type="button" variant="destructive" size="icon" onClick={() => removeItem(index)} disabled={items.length <= 1}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>Add Item</Button>
            </div>

            <div>
              <Label htmlFor="tax">Tax Rate (%)</Label>
              <Input id="tax" type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="e.g. 10" />
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

            <div className="md:col-span-2 lg:col-span-3">
              <div className="text-lg font-semibold">Total: ${total.toFixed(2)}</div>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
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
                                <span className="hidden sm:inline">HTML</span>
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