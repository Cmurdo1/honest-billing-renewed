import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DollarSign, FileText, Users, Clock, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

const Reports = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState("this_month");

  // Get date range based on selection
  const getDateRange = (range: string) => {
    const now = new Date();
    switch (range) {
      case "last_30_days":
        return { start: subDays(now, 30), end: now };
      case "this_month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "this_year":
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { start: startDate, end: endDate } = getDateRange(dateRange);

  // Fetch dashboard data
  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard-reports", user?.id, dateRange],
    queryFn: async () => {
      const [invoicesRes, quotesRes, clientsRes, timeEntriesRes, expensesRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("*, client:clients(name, company)")
          .eq("user_id", user.id)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString()),
        supabase
          .from("quotes")
          .select("*")
          .eq("user_id", user.id)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString()),
        supabase
          .from("clients")
          .select("*")
          .eq("user_id", user.id),
        supabase
          .from("time_entries")
          .select("*")
          .eq("user_id", user.id)
          .gte("date", startDate.toISOString().split('T')[0])
          .lte("date", endDate.toISOString().split('T')[0]),
        supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user.id)
          .gte("date", startDate.toISOString().split('T')[0])
          .lte("date", endDate.toISOString().split('T')[0])
      ]);

      return {
        invoices: invoicesRes.data || [],
        quotes: quotesRes.data || [],
        clients: clientsRes.data || [],
        timeEntries: timeEntriesRes.data || [],
        expenses: expensesRes.data || []
      };
    },
    enabled: !!user?.id,
  });

  // Calculate metrics
  const totalRevenue = dashboardData?.invoices.reduce((sum, inv) => {
    return inv.status === 'paid' ? sum + inv.total : sum;
  }, 0) || 0;

  const outstandingInvoices = dashboardData?.invoices.reduce((sum, inv) => {
    return inv.status === 'sent' || inv.status === 'overdue' ? sum + inv.total : sum;
  }, 0) || 0;

  const totalQuotes = dashboardData?.quotes.reduce((sum, quote) => sum + quote.total, 0) || 0;
  const approvedQuotes = dashboardData?.quotes.filter(q => q.status === 'approved').length || 0;
  const totalHours = dashboardData?.timeEntries.reduce((sum, entry) => sum + entry.hours_worked, 0) || 0;
  const billableHours = dashboardData?.timeEntries.reduce((sum, entry) => {
    return entry.is_billable ? sum + entry.hours_worked : sum;
  }, 0) || 0;
  const totalExpenses = dashboardData?.expenses.reduce((sum, exp) => sum + exp.amount, 0) || 0;

  // Top clients by revenue
  const clientRevenue = dashboardData?.invoices.reduce((acc, inv) => {
    if (inv.status === 'paid' && inv.client) {
      const clientName = inv.client.name;
      acc[clientName] = (acc[clientName] || 0) + inv.total;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  const topClients = Object.entries(clientRevenue)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Payment status breakdown
  const paymentStatusCounts = dashboardData?.invoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Recent activities
  const recentActivities = [
    ...(dashboardData?.invoices.map(inv => ({
      type: 'invoice',
      description: `Invoice ${inv.number} for ${inv.client?.name}`,
      amount: inv.total,
      date: inv.created_at,
      status: inv.status
    })) || []),
    ...(dashboardData?.quotes.map(quote => ({
      type: 'quote',
      description: `Quote ${quote.quote_number}`,
      amount: quote.total,
      date: quote.created_at,
      status: quote.status
    })) || [])
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Reports & Analytics</h2>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_30_days">Last 30 Days</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From paid invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${outstandingInvoices.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Pending payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.clients.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billableHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Out of {totalHours.toFixed(1)} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quote Conversion</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.quotes.length ? 
                Math.round((approvedQuotes / dashboardData.quotes.length) * 100) : 0
              }%
            </div>
            <p className="text-xs text-muted-foreground">
              {approvedQuotes} of {dashboardData?.quotes.length || 0} quotes approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Business expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalRevenue - totalExpenses).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Revenue minus expenses</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Top Clients by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topClients.map(([client, revenue], index) => (
                    <TableRow key={client}>
                      <TableCell className="font-medium">
                        #{index + 1} {client}
                      </TableCell>
                      <TableCell className="text-right">${revenue.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">No revenue data available</div>
            )}
          </CardContent>
        </Card>

        {/* Payment Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(paymentStatusCounts).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(paymentStatusCounts).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {count} invoice{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="font-medium">
                      {Math.round((count / (dashboardData?.invoices.length || 1)) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No invoice data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivities.map((activity, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {activity.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{activity.description}</TableCell>
                    <TableCell>${activity.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {activity.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(activity.date), 'MMM dd, yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">No recent activity</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports; 