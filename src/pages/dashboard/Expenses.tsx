import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { DollarSign, TrendingDown, FileText, Receipt } from "lucide-react";
import { format } from "date-fns";

const expenseCategories = [
  "Travel & Transportation",
  "Meals & Entertainment",
  "Office Supplies",
  "Equipment",
  "Software & Subscriptions",
  "Marketing & Advertising",
  "Professional Services",
  "Utilities",
  "Rent & Facilities",
  "Other"
];

const Expenses = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState("");
  const [isBillable, setIsBillable] = useState(false);

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["expense-clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch expenses
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      
      if (error) throw error;
      
      // Fetch client data separately
      const expensesWithClients = await Promise.all(
        (data || []).map(async (expense) => {
          if (!expense.client_id) return { ...expense, client: null };
          
          const { data: client } = await supabase
            .from("clients")
            .select("name, company")
            .eq("id", expense.client_id)
            .single();
          
          return { ...expense, client };
        })
      );
      
      return expensesWithClients;
    },
    enabled: !!user?.id,
  });

  const addExpense = useMutation({
    mutationFn: async (expenseData: any) => {
      const { error } = await supabase
        .from("expenses")
        .insert({
          user_id: user.id,
          client_id: clientId || null,
          description,
          amount: parseFloat(amount),
          date,
          category: category || null,
          is_billable: isBillable,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense created successfully");
      // Reset form
      setClientId("");
      setDescription("");
      setAmount("");
      setDate(new Date().toISOString().split('T')[0]);
      setCategory("");
      setIsBillable(false);
    },
    onError: (error) => {
      toast.error("Failed to create expense");
      console.error("Error creating expense:", error);
    },
  });

  const convertToInvoice = useMutation({
    mutationFn: async (expenseIds: string[]) => {
      // This would create an invoice from selected expenses
      // For now, just mark them as invoiced
      for (const expenseId of expenseIds) {
        const { error } = await supabase
          .from("expenses")
          .update({ is_invoiced: true })
          .eq("id", expenseId);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expenses converted to invoice");
    },
    onError: (error) => {
      toast.error("Failed to convert expenses");
      console.error("Error converting expenses:", error);
    },
  });

  const totalExpenses = expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
  const billableExpenses = expenses?.reduce((sum, expense) => {
    return expense.is_billable && !expense.is_invoiced ? sum + expense.amount : sum;
  }, 0) || 0;

  const thisMonthExpenses = expenses?.reduce((sum, expense) => {
    const expenseDate = new Date(expense.date);
    const now = new Date();
    if (expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear()) {
      return sum + expense.amount;
    }
    return sum;
  }, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Expenses</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${thisMonthExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billable Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${billableExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Expense</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was this expense for?"
                required
              />
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="client">Client (if billable)</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} {client.company && `- ${client.company}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="billable"
              checked={isBillable}
              onCheckedChange={setIsBillable}
            />
            <Label htmlFor="billable">This is a billable expense</Label>
          </div>

          <Button
            onClick={() => addExpense.mutate({})}
            disabled={!description || !amount || addExpense.isPending}
            className="w-full"
          >
            Add Expense
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
        </CardHeader>
        <CardContent>
          {expensesLoading ? (
            <div className="text-center py-8">Loading expenses...</div>
          ) : expenses?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No expenses found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses?.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{format(new Date(expense.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                    <TableCell>{expense.category || '-'}</TableCell>
                    <TableCell>{expense.client?.name || '-'}</TableCell>
                    <TableCell>${expense.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {expense.is_billable && (
                          <Badge variant="secondary" className="text-xs">Billable</Badge>
                        )}
                        {expense.is_invoiced && (
                          <Badge variant="default" className="text-xs">Invoiced</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {expense.is_billable && !expense.is_invoiced && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => convertToInvoice.mutate([expense.id])}
                          disabled={convertToInvoice.isPending}
                          title="Convert to Invoice"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
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

export default Expenses;