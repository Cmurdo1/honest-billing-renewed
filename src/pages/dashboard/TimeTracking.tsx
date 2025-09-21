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
import { Play, Square, Clock, DollarSign, FileText } from "lucide-react";
import { format } from "date-fns";

const TimeTracking = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [clientId, setClientId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isBillable, setIsBillable] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["time-clients", user?.id],
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

  // Fetch time entries
  const { data: timeEntries, isLoading: entriesLoading } = useQuery({
    queryKey: ["time-entries", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      
      if (error) throw error;
      
      // Fetch client data separately
      const entriesWithClients = await Promise.all(
        (data || []).map(async (entry) => {
          if (!entry.client_id) return { ...entry, client: null };
          
          const { data: client } = await supabase
            .from("clients")
            .select("name, company")
            .eq("id", entry.client_id)
            .single();
          
          return { ...entry, client };
        })
      );
      
      return entriesWithClients;
    },
    enabled: !!user?.id,
  });

  const addTimeEntry = useMutation({
    mutationFn: async (timeData: any) => {
      const totalAmount = parseFloat(hoursWorked) * parseFloat(hourlyRate);
      
      const { error } = await supabase
        .from("time_entries")
        .insert({
          user_id: user.id,
          client_id: clientId || null,
          project_name: projectName || null,
          description,
          hours_worked: parseFloat(hoursWorked),
          hourly_rate: parseFloat(hourlyRate),
          total_amount: totalAmount,
          date,
          is_billable: isBillable,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      toast.success("Time entry created successfully");
      // Reset form
      setClientId("");
      setProjectName("");
      setDescription("");
      setHoursWorked("");
      setHourlyRate("");
      setDate(new Date().toISOString().split('T')[0]);
      setIsBillable(true);
    },
    onError: (error) => {
      toast.error("Failed to create time entry");
      console.error("Error creating time entry:", error);
    },
  });

  const startTimer = () => {
    setIsTracking(true);
    setStartTime(new Date());
    toast.success("Timer started");
  };

  const stopTimer = () => {
    if (startTime) {
      const endTime = new Date();
      const diffMs = endTime.getTime() - startTime.getTime();
      const hours = diffMs / (1000 * 60 * 60);
      setHoursWorked(hours.toFixed(2));
      toast.success(`Timer stopped. Logged ${hours.toFixed(2)} hours`);
    }
    setIsTracking(false);
    setStartTime(null);
  };

  const convertToInvoice = useMutation({
    mutationFn: async (entryIds: string[]) => {
      // This would create an invoice from selected time entries
      // For now, just mark them as invoiced
      for (const entryId of entryIds) {
        const { error } = await supabase
          .from("time_entries")
          .update({ is_invoiced: true })
          .eq("id", entryId);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      toast.success("Time entries converted to invoice");
    },
    onError: (error) => {
      toast.error("Failed to convert time entries");
      console.error("Error converting entries:", error);
    },
  });

  const totalUnbilledHours = timeEntries?.reduce((sum, entry) => {
    return entry.is_billable && !entry.is_invoiced ? sum + entry.hours_worked : sum;
  }, 0) || 0;

  const totalUnbilledAmount = timeEntries?.reduce((sum, entry) => {
    return entry.is_billable && !entry.is_invoiced ? sum + entry.total_amount : sum;
  }, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Time Tracking</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unbilled Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnbilledHours.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unbilled Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalUnbilledAmount.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timer Status</CardTitle>
            {isTracking ? <Play className="h-4 w-4 text-green-600" /> : <Square className="h-4 w-4 text-gray-400" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isTracking ? "Running" : "Stopped"}</div>
            {isTracking && startTime && (
              <div className="text-sm text-muted-foreground">
                Started: {format(startTime, 'HH:mm')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Time Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="client">Client</Label>
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
            <div>
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project name (optional)"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="hoursWorked">Hours Worked</Label>
              <div className="flex gap-2">
                <Input
                  id="hoursWorked"
                  type="number"
                  step="0.25"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  placeholder="0.00"
                  required
                />
                {!isTracking ? (
                  <Button onClick={startTimer} variant="outline" size="sm">
                    <Play className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={stopTimer} variant="outline" size="sm">
                    <Square className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="hourlyRate">Hourly Rate</Label>
              <Input
                id="hourlyRate"
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
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
            <div className="flex items-end">
              <div className="flex items-center space-x-2">
                <Switch
                  id="billable"
                  checked={isBillable}
                  onCheckedChange={setIsBillable}
                />
                <Label htmlFor="billable">Billable</Label>
              </div>
            </div>
          </div>

          <div>
            <Label>Total Amount</Label>
            <Input
              value={`$${((parseFloat(hoursWorked) || 0) * (parseFloat(hourlyRate) || 0)).toFixed(2)}`}
              readOnly
              className="bg-gray-50"
            />
          </div>

          <Button
            onClick={() => addTimeEntry.mutate({})}
            disabled={!description || !hoursWorked || !hourlyRate || addTimeEntry.isPending}
            className="w-full"
          >
            Log Time Entry
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entriesLoading ? (
            <div className="text-center py-8">Loading time entries...</div>
          ) : timeEntries?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No time entries found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeEntries?.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(new Date(entry.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{entry.client?.name || '-'}</TableCell>
                    <TableCell>{entry.project_name || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                    <TableCell>{entry.hours_worked}</TableCell>
                    <TableCell>${entry.hourly_rate}</TableCell>
                    <TableCell>${entry.total_amount?.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {entry.is_billable && (
                          <Badge variant="secondary" className="text-xs">Billable</Badge>
                        )}
                        {entry.is_invoiced && (
                          <Badge variant="default" className="text-xs">Invoiced</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.is_billable && !entry.is_invoiced && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => convertToInvoice.mutate([entry.id])}
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

export default TimeTracking;