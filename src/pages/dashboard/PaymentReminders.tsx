import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Send, Clock, AlertTriangle, DollarSign, Mail } from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";

const reminderTypes = [
  { value: "gentle", label: "Gentle Reminder", daysAfter: 3 },
  { value: "standard", label: "Standard Reminder", daysAfter: 7 },
  { value: "urgent", label: "Urgent Reminder", daysAfter: 14 },
  { value: "final", label: "Final Notice", daysAfter: 30 }
];

const PaymentReminders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [reminderType, setReminderType] = useState("");
  const [autoReminders, setAutoReminders] = useState(false);

  // Fetch overdue invoices
  const { data: overdueInvoices } = useQuery({
    queryKey: ["overdue-invoices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          client:clients(name, email, company)
        `)
        .eq("user_id", user.id)
        .in("status", ["sent", "overdue"])
        .order("due_date", { ascending: true });
      
      if (error) throw error;
      
      // Calculate days overdue for each invoice
      const today = new Date();
      return (data || []).map(invoice => ({
        ...invoice,
        daysOverdue: invoice.due_date ? 
          Math.max(0, differenceInDays(today, new Date(invoice.due_date))) : 0
      }));
    },
    enabled: !!user?.id,
  });

  // Fetch payment reminders history
  const { data: reminders, isLoading: remindersLoading } = useQuery({
    queryKey: ["payment-reminders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_reminders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Fetch invoice data separately for each reminder
      const remindersWithInvoices = await Promise.all(
        (data || []).map(async (reminder) => {
          const { data: invoice } = await supabase
            .from("invoices")
            .select(`
              number,
              total,
              client:clients(name, company)
            `)
            .eq("id", reminder.invoice_id)
            .single();
          
          return { ...reminder, invoice };
        })
      );
      
      return remindersWithInvoices;
    },
    enabled: !!user?.id,
  });

  const sendReminder = useMutation({
    mutationFn: async ({ invoiceId, type }: { invoiceId: string; type: string }) => {
      // First, create the reminder record
      const invoice = overdueInvoices?.find(inv => inv.id === invoiceId);
      if (!invoice) throw new Error("Invoice not found");

      const { error: reminderError } = await supabase
        .from("payment_reminders")
        .insert({
          user_id: user.id,
          invoice_id: invoiceId,
          reminder_type: type,
          days_overdue: invoice.daysOverdue,
          sent_at: new Date().toISOString(),
        });

      if (reminderError) throw reminderError;

      // Send email using the send-invoice-email function
      const { error: emailError } = await supabase.functions.invoke('send-invoice-email', {
        body: { 
          invoiceId,
          isReminder: true,
          reminderType: type
        }
      });

      if (emailError) throw emailError;

      return { invoiceId, type };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payment-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["overdue-invoices"] });
      toast.success(`${data.type} reminder sent successfully`);
      setSelectedInvoice("");
      setReminderType("");
    },
    onError: (error: any) => {
      toast.error("Failed to send reminder");
      console.error("Error sending reminder:", error);
    },
  });

  const sendBulkReminders = useMutation({
    mutationFn: async () => {
      if (!overdueInvoices) return;

      const results = [];
      
      for (const invoice of overdueInvoices) {
        // Determine appropriate reminder type based on days overdue
        let reminderType = "gentle";
        if (invoice.daysOverdue >= 30) reminderType = "final";
        else if (invoice.daysOverdue >= 14) reminderType = "urgent";
        else if (invoice.daysOverdue >= 7) reminderType = "standard";

        // Check if we've already sent this type of reminder
        const existingReminder = await supabase
          .from("payment_reminders")
          .select("*")
          .eq("invoice_id", invoice.id)
          .eq("reminder_type", reminderType)
          .single();

        if (existingReminder.data) continue; // Skip if already sent

        try {
          // Create reminder record
          await supabase
            .from("payment_reminders")
            .insert({
              user_id: user.id,
              invoice_id: invoice.id,
              reminder_type: reminderType,
              days_overdue: invoice.daysOverdue,
              sent_at: new Date().toISOString(),
            });

          // Send email
          await supabase.functions.invoke('send-invoice-email', {
            body: { 
              invoiceId: invoice.id,
              isReminder: true,
              reminderType
            }
          });

          results.push({ invoice: invoice.number, type: reminderType, success: true });
        } catch (error) {
          results.push({ invoice: invoice.number, type: reminderType, success: false, error });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["payment-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["overdue-invoices"] });
      
      const successful = results?.filter(r => r.success).length || 0;
      const total = results?.length || 0;
      
      if (successful === total) {
        toast.success(`Successfully sent ${successful} payment reminders`);
      } else {
        toast.warning(`Sent ${successful} of ${total} reminders. Some failed.`);
      }
    },
    onError: (error: any) => {
      toast.error("Failed to send bulk reminders");
      console.error("Error sending bulk reminders:", error);
    },
  });

  const totalOverdue = overdueInvoices?.reduce((sum, inv) => sum + inv.total, 0) || 0;
  const criticalOverdue = overdueInvoices?.filter(inv => inv.daysOverdue > 30).length || 0;
  const recentReminders = reminders?.filter(r => 
    differenceInDays(new Date(), new Date(r.created_at)) <= 7
  ).length || 0;

  const getReminderBadge = (type: string) => {
    const colors = {
      gentle: "bg-blue-100 text-blue-800",
      standard: "bg-yellow-100 text-yellow-800",
      urgent: "bg-orange-100 text-orange-800",
      final: "bg-red-100 text-red-800"
    };
    return colors[type as keyof typeof colors] || colors.gentle;
  };

  const getOverdueBadge = (days: number) => {
    if (days === 0) return "bg-green-100 text-green-800";
    if (days <= 7) return "bg-yellow-100 text-yellow-800";
    if (days <= 30) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Payment Reminders</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-reminders"
              checked={autoReminders}
              onCheckedChange={setAutoReminders}
            />
            <Label htmlFor="auto-reminders">Auto-send reminders</Label>
          </div>
          <Button 
            onClick={() => sendBulkReminders.mutate()}
            disabled={sendBulkReminders.isPending || !overdueInvoices?.length}
          >
            <Send className="h-4 w-4 mr-2" />
            Send All Due
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Overdue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalOverdue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {overdueInvoices?.length || 0} overdue invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical (30+ days)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalOverdue}</div>
            <p className="text-xs text-muted-foreground">Need immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reminders Sent (7 days)</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentReminders}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      {/* Send Individual Reminder */}
      <Card>
        <CardHeader>
          <CardTitle>Send Payment Reminder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="invoice">Select Invoice</Label>
              <Select value={selectedInvoice} onValueChange={setSelectedInvoice}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an overdue invoice" />
                </SelectTrigger>
                <SelectContent>
                  {overdueInvoices?.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.number} - {invoice.client?.name} 
                      {invoice.daysOverdue > 0 && ` (${invoice.daysOverdue} days overdue)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reminderType">Reminder Type</Label>
              <Select value={reminderType} onValueChange={setReminderType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reminder type" />
                </SelectTrigger>
                <SelectContent>
                  {reminderTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => sendReminder.mutate({ invoiceId: selectedInvoice, type: reminderType })}
                disabled={!selectedInvoice || !reminderType || sendReminder.isPending}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Reminder
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overdue Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Overdue Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {!overdueInvoices?.length ? (
            <div className="text-center py-8 text-gray-500">
              No overdue invoices found! 🎉
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Last Reminder</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueInvoices.map((invoice) => {
                  const lastReminder = reminders?.find(r => 
                    r.invoice_id === invoice.id
                  );
                  
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.client?.name}</div>
                          <div className="text-sm text-gray-500">{invoice.client?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>${invoice.total.toFixed(2)}</TableCell>
                      <TableCell>
                        {invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getOverdueBadge(invoice.daysOverdue)}>
                          {invoice.daysOverdue === 0 ? 'Due today' : `${invoice.daysOverdue} days`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lastReminder ? (
                          <div className="text-sm">
                            <Badge className={getReminderBadge(lastReminder.reminder_type)}>
                              {lastReminder.reminder_type}
                            </Badge>
                            <div className="text-xs text-gray-500 mt-1">
                              {format(new Date(lastReminder.sent_at!), 'MMM dd')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">None sent</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedInvoice(invoice.id);
                            // Auto-suggest reminder type based on days overdue
                            let suggestedType = "gentle";
                            if (invoice.daysOverdue >= 30) suggestedType = "final";
                            else if (invoice.daysOverdue >= 14) suggestedType = "urgent";
                            else if (invoice.daysOverdue >= 7) suggestedType = "standard";
                            setReminderType(suggestedType);
                          }}
                          title="Send Reminder"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reminder History */}
      <Card>
        <CardHeader>
          <CardTitle>Reminder History</CardTitle>
        </CardHeader>
        <CardContent>
          {remindersLoading ? (
            <div className="text-center py-8">Loading reminder history...</div>
          ) : reminders?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No reminders sent yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Sent</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reminders?.map((reminder) => (
                  <TableRow key={reminder.id}>
                    <TableCell>
                      {reminder.sent_at ? format(new Date(reminder.sent_at), 'MMM dd, yyyy HH:mm') : '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {reminder.invoice?.number}
                    </TableCell>
                    <TableCell>
                      {reminder.invoice?.client?.name}
                    </TableCell>
                    <TableCell>
                      <Badge className={getReminderBadge(reminder.reminder_type)}>
                        {reminder.reminder_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{reminder.days_overdue} days</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        Sent
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentReminders;