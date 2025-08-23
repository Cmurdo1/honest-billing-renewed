import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { InvoiceFormData, invoiceSchema } from "@/lib/validations";
import InvoiceItemsManager from "./InvoiceItemsManager";

interface InvoiceFormProps {
  invoiceId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const InvoiceForm = ({ invoiceId, onSuccess, onCancel }: InvoiceFormProps) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  const [formData, setFormData] = useState<Partial<InvoiceFormData>>({
    number: "",
    client_id: "",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    status: "draft",
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: "",
    items: [],
  });

  const [taxRate, setTaxRate] = useState(0);

  // Fetch clients for dropdown
  const clients = useQuery({
    queryKey: ["invoice-clients", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id,name")
        .eq("user_id", user!.id)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch user settings for tax rate
  const userSettings = useQuery({
    queryKey: ["user-settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("tax_rate")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing invoice if editing
  const existingInvoice = useQuery({
    queryKey: ["invoice", invoiceId],
    enabled: !!invoiceId && !!user,
    queryFn: async () => {
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId!)
        .eq("user_id", user!.id)
        .single();
      
      if (invoiceError) throw invoiceError;

      const { data: items, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId!)
        .order("position");
      
      if (itemsError) throw itemsError;

      return { ...invoice, items };
    },
  });

  // Set form data when editing existing invoice
  useEffect(() => {
    if (existingInvoice.data) {
      const invoice = existingInvoice.data;
      setFormData({
        number: invoice.number,
        client_id: invoice.client_id,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date || "",
        status: invoice.status,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        total: invoice.total,
        notes: invoice.notes || "",
        items: invoice.items || [],
      });
    }
  }, [existingInvoice.data]);

  // Set tax rate from user settings
  useEffect(() => {
    if (userSettings.data?.tax_rate) {
      setTaxRate(userSettings.data.tax_rate);
    }
  }, [userSettings.data]);

  const saveInvoice = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      if (!user) throw new Error("Not authenticated");

      const validation = invoiceSchema.safeParse(data);
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      const invoiceData = {
        user_id: user.id,
        client_id: data.client_id,
        number: data.number,
        status: data.status,
        issue_date: data.issue_date,
        due_date: data.due_date || null,
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        notes: data.notes || null,
      };

      let savedInvoiceId = invoiceId;

      if (invoiceId) {
        // Update existing invoice
        const { error } = await supabase
          .from("invoices")
          .update(invoiceData)
          .eq("id", invoiceId)
          .eq("user_id", user.id);
        if (error) throw error;

        // Delete existing items
        const { error: deleteError } = await supabase
          .from("invoice_items")
          .delete()
          .eq("invoice_id", invoiceId);
        if (deleteError) throw deleteError;
      } else {
        // Create new invoice
        const { data: newInvoice, error } = await supabase
          .from("invoices")
          .insert([invoiceData])
          .select()
          .single();
        if (error) throw error;
        savedInvoiceId = newInvoice.id;
      }

      // Insert items
      if (data.items.length > 0) {
        const itemsData = data.items.map((item, index) => ({
          invoice_id: savedInvoiceId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount || item.quantity * item.unit_price,
          position: index + 1,
        }));

        const { error: itemsError } = await supabase
          .from("invoice_items")
          .insert(itemsData);
        if (itemsError) throw itemsError;
      }

      return savedInvoiceId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", user?.id] });
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      toast.success(invoiceId ? "Invoice updated" : "Invoice created");
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save invoice");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.items || formData.items.length === 0) {
      toast.error("Please add at least one item to the invoice");
      return;
    }

    saveInvoice.mutate(formData as InvoiceFormData);
  };

  const updateFormData = (field: keyof InvoiceFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemsChange = (items: any[]) => {
    updateFormData('items', items);
  };

  const handleTotalsChange = (subtotal: number, total: number) => {
    const tax = total - subtotal;
    setFormData(prev => ({ ...prev, subtotal, tax, total }));
  };

  if (invoiceId && existingInvoice.isLoading) {
    return <div>Loading invoice...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{invoiceId ? "Edit Invoice" : "Create Invoice"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="number">Invoice Number</Label>
                <Input
                  id="number"
                  value={formData.number || ""}
                  onChange={(e) => updateFormData('number', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Client</Label>
                <Select value={formData.client_id || ""} onValueChange={(value) => updateFormData('client_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.data?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="issue_date">Issue Date</Label>
                <Input
                  id="issue_date"
                  type="date"
                  value={formData.issue_date || ""}
                  onChange={(e) => updateFormData('issue_date', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date || ""}
                  onChange={(e) => updateFormData('due_date', e.target.value)}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status || "draft"} onValueChange={(value) => updateFormData('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => updateFormData('notes', e.target.value)}
                placeholder="Additional notes for this invoice"
              />
            </div>
          </form>
        </CardContent>
      </Card>

      <InvoiceItemsManager
        items={formData.items || []}
        onItemsChange={handleItemsChange}
        onTotalsChange={handleTotalsChange}
        taxRate={taxRate}
      />

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button 
          onClick={handleSubmit} 
          disabled={saveInvoice.isPending}
        >
          {saveInvoice.isPending ? "Saving..." : (invoiceId ? "Update Invoice" : "Create Invoice")}
        </Button>
      </div>
    </div>
  );
};

export default InvoiceForm;
