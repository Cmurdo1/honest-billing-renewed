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
import { toast } from "sonner";
import { Trash2, Plus, FileText, CircleCheck as CheckCircle } from "lucide-react";
import { format } from "date-fns";

const Quotes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [quoteNumber, setQuoteNumber] = useState(`QUO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
  const [clientId, setClientId] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [tax, setTax] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ description: "", quantity: 1, unitPrice: 0 }]);

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["quote-clients", user?.id],
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

  // Fetch quotes
  const { data: quotes, isLoading: quotesLoading } = useQuery({
    queryKey: ["quotes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Fetch client data separately
      const quotesWithClients = await Promise.all(
        (data || []).map(async (quote) => {
          const { data: client } = await supabase
            .from("clients")
            .select("name, company")
            .eq("id", quote.client_id)
            .single();
          
          return { ...quote, client };
        })
      );
      
      return quotesWithClients;
    },
    enabled: !!user?.id,
  });

  const addQuote = useMutation({
    mutationFn: async (quoteData: any) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      if (!clientId) {
        throw new Error("Please select a client");
      }

      if (!subtotal || isNaN(parseFloat(subtotal))) {
        throw new Error("Please enter a valid subtotal");
      }

      const subtotalNum = parseFloat(subtotal);
      const taxNum = parseFloat(tax) || 0;
      const total = subtotalNum + taxNum;

      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          user_id: user.id,
          client_id: clientId,
          quote_number: quoteNumber,
          subtotal: subtotalNum,
          tax: taxNum,
          total,
          notes,
          expiry_date: expiryDate || null,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Add quote items
      for (const [index, item] of items.entries()) {
        if (item.description) {
          const { error: itemError } = await supabase
            .from("quote_items")
            .insert({
              quote_id: quote.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              amount: item.quantity * item.unitPrice,
              position: index + 1,
            });

          if (itemError) throw itemError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote created successfully");
      // Reset form
      setQuoteNumber(`QUO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
      setClientId("");
      setSubtotal("");
      setTax("");
      setExpiryDate("");
      setNotes("");
      setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to create quote";
      toast.error(errorMessage);
      console.error("Error creating quote:", error);
    },
  });

  const convertToInvoice = useMutation({
    mutationFn: async (quoteId: string) => {
      const { data, error } = await supabase
        .rpc("convert_quote_to_invoice", { quote_id: quoteId });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Quote converted to invoice successfully");
    },
    onError: (error) => {
      toast.error("Failed to convert quote to invoice");
      console.error("Error converting quote:", error);
    },
  });

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    
    // Recalculate subtotal
    const newSubtotal = newItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    setSubtotal(newSubtotal.toString());
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      converted: "bg-purple-100 text-purple-800"
    };
    return statusColors[status as keyof typeof statusColors] || statusColors.draft;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Quotes</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Quote</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="quoteNumber">Quote Number</Label>
              <Input
                id="quoteNumber"
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
                placeholder="Quote number"
              />
            </div>
            <div>
              <Label htmlFor="client">Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
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
            <div>
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Quote Items</Label>
            <div className="space-y-2 mt-2">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      value={`$${(item.quantity * item.unitPrice).toFixed(2)}`}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={addItem} className="mt-2">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="subtotal">Subtotal</Label>
              <Input
                id="subtotal"
                type="number"
                step="0.01"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
                placeholder="0.00"
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
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="total">Total</Label>
              <Input
                id="total"
                value={`$${((parseFloat(subtotal) || 0) + (parseFloat(tax) || 0)).toFixed(2)}`}
                readOnly
                className="bg-gray-50"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
            />
          </div>

          <Button
            onClick={() => addQuote.mutate({})}
            disabled={!clientId || !subtotal || addQuote.isPending}
            className="w-full"
          >
            Create Quote
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          {quotesLoading ? (
            <div className="text-center py-8">Loading quotes...</div>
          ) : quotes?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No quotes found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes?.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.quote_number}</TableCell>
                    <TableCell>{quote.client?.name} {quote.client?.company && `- ${quote.client.company}`}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(quote.status)}>
                        {quote.status}
                      </Badge>
                    </TableCell>
                    <TableCell>${quote.total?.toFixed(2)}</TableCell>
                    <TableCell>{format(new Date(quote.issue_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{quote.expiry_date ? format(new Date(quote.expiry_date), 'MMM dd, yyyy') : '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => convertToInvoice.mutate(quote.id)}
                          disabled={quote.status === 'converted' || convertToInvoice.isPending}
                          title="Convert to Invoice"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          title="View Quote"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
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

export default Quotes;