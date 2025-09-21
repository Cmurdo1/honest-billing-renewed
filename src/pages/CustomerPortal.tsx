import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download, Eye, CreditCard, FileText, DollarSign, Clock } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const CustomerPortal = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [customerData, setCustomerData] = useState<any>(null);

  // Check if user is a customer portal user
  useEffect(() => {
    const checkCustomerAccess = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("customer_users")
        .select(`
          *,
          client:clients(*)
        `)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        toast.error("Access denied. This portal is for customers only.");
        navigate("/auth");
        return;
      }

      setCustomerData(data);
    };

    checkCustomerAccess();
  }, [user, navigate]);

  // Fetch customer invoices
  const { data: invoices } = useQuery({
    queryKey: ["customer-invoices", customerData?.client_id],
    queryFn: async () => {
      if (!customerData?.client_id) return [];

      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("client_id", customerData.client_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!customerData?.client_id,
  });

  // Fetch customer quotes
  const { data: quotes } = useQuery({
    queryKey: ["customer-quotes", customerData?.client_id],
    queryFn: async () => {
      if (!customerData?.client_id) return [];

      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("client_id", customerData.client_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!customerData?.client_id,
  });

  // Fetch payment history
  const { data: payments } = useQuery({
    queryKey: ["customer-payments", customerData?.client_id],
    queryFn: async () => {
      if (!customerData?.client_id) return [];

      // This would typically come from Stripe or payment processor
      // For now, return paid invoices as payment history
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("client_id", customerData.client_id)
        .eq("status", "paid")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!customerData?.client_id,
  });

  const handleQuoteApproval = async (quoteId: string, action: 'approve' | 'reject') => {
    const { error } = await supabase
      .from("quotes")
      .update({ status: action === 'approve' ? 'approved' : 'rejected' })
      .eq("id", quoteId);

    if (error) {
      toast.error("Failed to update quote");
      return;
    }

    toast.success(`Quote ${action}d successfully`);
  };

  const handlePayment = (invoiceId: string) => {
    // This would integrate with Stripe or other payment processor
    toast.info("Payment integration would be implemented here");
  };

  const downloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId }
      });

      if (error) throw error;

      // Create and download the HTML file
      const htmlBlob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(htmlBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceNumber}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Invoice downloaded successfully");
    } catch (error: any) {
      toast.error("Failed to download invoice");
      console.error("Download error:", error);
    }
  };

  if (!customerData) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800"
    };
    return statusColors[status as keyof typeof statusColors] || statusColors.draft;
  };

  const totalOwed = invoices?.reduce((sum, inv) => {
    return inv.status === 'sent' || inv.status === 'overdue' ? sum + inv.total : sum;
  }, 0) || 0;

  const totalPaid = payments?.reduce((sum, payment) => sum + payment.total, 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Customer Portal</h1>
            <p className="text-muted-foreground">
              Welcome back, {customerData.client.name}
            </p>
          </div>
          <Button onClick={signOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalOwed.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalPaid.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {invoices?.filter(inv => inv.status === 'sent' || inv.status === 'overdue').length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="invoices" className="space-y-4">
          <TabsList>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="quotes">Quotes</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {invoices?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No invoices found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices?.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.number}</TableCell>
                          <TableCell>{format(new Date(invoice.issue_date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : '-'}</TableCell>
                          <TableCell>${invoice.total.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(invoice.status)}>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadInvoice(invoice.id, invoice.number)}
                                title="Download Invoice"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                                <Button
                                  size="sm"
                                  onClick={() => handlePayment(invoice.id)}
                                  title="Pay Now"
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quotes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Quotes</CardTitle>
              </CardHeader>
              <CardContent>
                {quotes?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No quotes found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quote #</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotes?.map((quote) => (
                        <TableRow key={quote.id}>
                          <TableCell className="font-medium">{quote.quote_number}</TableCell>
                          <TableCell>{format(new Date(quote.issue_date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{quote.expiry_date ? format(new Date(quote.expiry_date), 'MMM dd, yyyy') : '-'}</TableCell>
                          <TableCell>${quote.total.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(quote.status)}>
                              {quote.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                title="View Quote"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {quote.status === 'sent' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleQuoteApproval(quote.id, 'approve')}
                                    title="Approve Quote"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleQuoteApproval(quote.id, 'reject')}
                                    title="Reject Quote"
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {payments?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No payment history found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments?.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.number}</TableCell>
                          <TableCell>{format(new Date(payment.updated_at), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>${payment.total.toFixed(2)}</TableCell>
                          <TableCell>Credit Card</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CustomerPortal;