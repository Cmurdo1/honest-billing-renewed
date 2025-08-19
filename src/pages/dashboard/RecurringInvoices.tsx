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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar, RefreshCw, Plus, Trash2 } from "lucide-react";
import { format, addDays, addWeeks, addMonths, addYears } from "date-fns";
import ProFeatureGate from "@/components/ProFeatureGate";

const sb = supabase as any;

const RecurringInvoices = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [templateNumber, setTemplateNumber] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [frequency, setFrequency] = useState<string>("monthly");
  const [nextDueDate, setNextDueDate] = useState<string>("");
  const [subtotal, setSubtotal] = useState("");
  const [tax, setTax] = useState("");
  const [notes, setNotes] = useState("");

  const clients = useQuery({
    queryKey: ["recurring-clients", user?.id],
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

  const recurringInvoices = useQuery({
    queryKey: ["recurring-invoices", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb
        .from("recurring_invoices")
        .select(`
          id, template_number, frequency, next_due_date, last_generated_date, 
          is_active, total, notes, created_at,
          client:clients(name)
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const addRecurringInvoice = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!clientId) throw new Error("Please choose a client");
      if (!nextDueDate) throw new Error("Please set next due date");
      
      const total = Number(subtotal || 0) + Number(tax || 0);
      const { error } = await sb.from("recurring_invoices").insert([
        {
          user_id: user.id,
          client_id: clientId,
          template_number: templateNumber,
          frequency,
          next_due_date: nextDueDate,
          subtotal: Number(subtotal || 0),
          tax: Number(tax || 0),
          total,
          notes: notes || null,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring-invoices", user?.id] });
      setTemplateNumber("");
      setClientId("");
      setFrequency("monthly");
      setNextDueDate("");
      setSubtotal("");
      setTax("");
      setNotes("");
      toast.success("Recurring invoice template created");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create recurring invoice"),
  });

  const toggleRecurringInvoice = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await sb
        .from("recurring_invoices")
        .update({ is_active: !isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring-invoices", user?.id] });
      toast.success("Recurring invoice updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update recurring invoice"),
  });

  const deleteRecurringInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb
        .from("recurring_invoices")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring-invoices", user?.id] });
      toast.success("Recurring invoice deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete recurring invoice"),
  });

  const generateInvoice = useMutation({
    mutationFn: async (recurringInvoiceId: string) => {
      const recurring = recurringInvoices.data?.find(r => r.id === recurringInvoiceId);
      if (!recurring) throw new Error("Recurring invoice not found");

      // Generate invoice number based on template
      const invoiceNumber = `${recurring.template_number}-${Date.now()}`;
      
      const { error } = await sb.from("invoices").insert([
        {
          user_id: user!.id,
          client_id: recurring.client_id,
          number: invoiceNumber,
          status: 'sent',
          issue_date: new Date().toISOString().slice(0, 10),
          subtotal: recurring.subtotal,
          tax: recurring.tax,
          total: recurring.total,
          notes: recurring.notes,
        },
      ]);
      if (error) throw error;

      // Update next due date based on frequency
      const currentDate = new Date();
      let nextDate;
      switch (recurring.frequency) {
        case 'weekly':
          nextDate = addWeeks(currentDate, 1);
          break;
        case 'monthly':
          nextDate = addMonths(currentDate, 1);
          break;
        case 'quarterly':
          nextDate = addMonths(currentDate, 3);
          break;
        case 'annually':
          nextDate = addYears(currentDate, 1);
          break;
        default:
          nextDate = addMonths(currentDate, 1);
      }

      const { error: updateError } = await sb
        .from("recurring_invoices")
        .update({ 
          next_due_date: format(nextDate, 'yyyy-MM-dd'),
          last_generated_date: format(currentDate, 'yyyy-MM-dd')
        })
        .eq("id", recurringInvoiceId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring-invoices", user?.id] });
      qc.invalidateQueries({ queryKey: ["invoices", user?.id] });
      toast.success("Invoice generated successfully");
    },
    onError: (e: any) => toast.error(e.message || "Failed to generate invoice"),
  });

  return (
    <ProFeatureGate 
      featureName="Recurring Invoices" 
      description="Set up automatic recurring invoices for your regular clients. Invoices will be generated automatically based on your schedule."
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-primary">Recurring Invoices</h2>
          <Badge variant="secondary" className="ml-2">Pro Feature</Badge>
        </div>

        {/* Create Recurring Invoice */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Recurring Invoice Template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                addRecurringInvoice.mutate();
              }}
            >
              <div>
                <Label htmlFor="template_number">Template Number</Label>
                <Input 
                  id="template_number" 
                  value={templateNumber} 
                  onChange={(e) => setTemplateNumber(e.target.value)} 
                  placeholder="e.g., REC-001"
                  required 
                />
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
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="next_due">Next Due Date</Label>
                <Input 
                  id="next_due" 
                  type="date" 
                  value={nextDueDate} 
                  onChange={(e) => setNextDueDate(e.target.value)} 
                  required
                />
              </div>
              <div>
                <Label htmlFor="subtotal">Subtotal</Label>
                <Input 
                  id="subtotal" 
                  type="number" 
                  step="0.01" 
                  value={subtotal} 
                  onChange={(e) => setSubtotal(e.target.value)} 
                />
              </div>
              <div>
                <Label htmlFor="tax">Tax</Label>
                <Input 
                  id="tax" 
                  type="number" 
                  step="0.01" 
                  value={tax} 
                  onChange={(e) => setTax(e.target.value)} 
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes for this recurring invoice..."
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={addRecurringInvoice.isPending} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Recurring Invoice
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Recurring Invoices List */}
        <Card>
          <CardHeader>
            <CardTitle>Recurring Invoice Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead>Last Generated</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurringInvoices.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8}>Loading…</TableCell>
                  </TableRow>
                ) : recurringInvoices.data && recurringInvoices.data.length > 0 ? (
                  recurringInvoices.data.map((recurring: any) => (
                    <TableRow key={recurring.id}>
                      <TableCell className="font-medium">{recurring.template_number}</TableCell>
                      <TableCell>{recurring.client?.name ?? "—"}</TableCell>
                      <TableCell className="capitalize">{recurring.frequency}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(recurring.next_due_date), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {recurring.last_generated_date 
                          ? format(new Date(recurring.last_generated_date), 'MMM dd, yyyy')
                          : "Never"
                        }
                      </TableCell>
                      <TableCell>${Number(recurring.total).toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={recurring.is_active}
                            onCheckedChange={() => 
                              toggleRecurringInvoice.mutate({ 
                                id: recurring.id, 
                                isActive: recurring.is_active 
                              })
                            }
                          />
                          <span className={recurring.is_active ? "text-primary" : "text-muted-foreground"}>
                            {recurring.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="default" 
                            onClick={() => generateInvoice.mutate(recurring.id)}
                            disabled={!recurring.is_active || generateInvoice.isPending}
                          >
                            Generate
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => deleteRecurringInvoice.mutate(recurring.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No recurring invoice templates yet. Create one to get started!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ProFeatureGate>
  );
};

export default RecurringInvoices;