import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useProAccess } from "@/hooks/useProAccess";
import { usePDFGeneration } from "@/hooks/usePDFGeneration";
import { Download, Send, Crown, Edit, Plus, Trash2 } from "lucide-react";
import InvoiceForm from "@/components/InvoiceForm";
import SendInvoiceDialog from "@/components/SendInvoiceDialog";
import { config } from "@/lib/config";

const sb = supabase as any;

const Invoices = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { isPro } = useProAccess();
  const { generatePDF, isGenerating } = usePDFGeneration();

  const [showForm, setShowForm] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  // Remove the clients query as it's now handled in InvoiceForm

  const invoices = useQuery({
    queryKey: ["invoices", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, number, status, total, issue_date, due_date, client:clients(name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      if (!user) throw new Error("Not authenticated");

      // Delete invoice items first
      const { error: itemsError } = await supabase
        .from("invoice_items")
        .delete()
        .eq("invoice_id", invoiceId);
      if (itemsError) throw itemsError;

      // Delete invoice
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", user?.id] });
      toast.success("Invoice deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete invoice"),
  });

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingInvoiceId(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingInvoiceId(null);
  };

  const startEdit = (invoiceId: string) => {
    setEditingInvoiceId(invoiceId);
    setShowForm(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      sent: "outline",
      paid: "default",
      overdue: "destructive",
      cancelled: "secondary",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  if (showForm) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {editingInvoiceId ? "Edit Invoice" : "Create Invoice"}
          </h2>
          <Button variant="outline" onClick={handleFormCancel}>
            Back to Invoices
          </Button>
        </div>
        <InvoiceForm
          invoiceId={editingInvoiceId || undefined}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Invoices</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

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
                    <TableCell>{getStatusBadge(inv.status)}</TableCell>
                    <TableCell>${Number(inv.total).toFixed(2)}</TableCell>
                    <TableCell>{inv.issue_date}</TableCell>
                    <TableCell>{inv.due_date || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(inv.id)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        {isPro ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="flex items-center gap-1"
                              onClick={() => generatePDF(inv.id)}
                              disabled={isGenerating}
                            >
                              <Download className="h-3 w-3" />
                              {isGenerating ? "Generating..." : "PDF"}
                            </Button>
                            <SendInvoiceDialog
                              invoiceId={inv.id}
                              invoiceNumber={inv.number}
                              clientEmail={inv.client?.email}
                              clientName={inv.client?.name || "Client"}
                            />
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => window.open(config.stripe.checkoutUrl, "_blank")}
                            className="text-xs flex items-center gap-1"
                          >
                            <Crown className="h-3 w-3" />
                            Pro: Export
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this invoice?")) {
                              deleteInvoice.mutate(inv.id);
                            }
                          }}
                          disabled={deleteInvoice.isPending}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
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
