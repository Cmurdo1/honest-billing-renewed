import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const sb = supabase as any;

const Settings = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("USD");

  const settings = useQuery({
    queryKey: ["user-settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb
        .from("user_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any | null;
    },
  });

  useEffect(() => {
    if (settings.data) {
      setDisplayName(settings.data.display_name || "");
      setCompanyName(settings.data.company_name || "");
      setAddress(settings.data.address || "");
      setCurrency(settings.data.currency || "USD");
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await sb.from("user_settings").upsert({
        user_id: user.id,
        display_name: displayName || null,
        company_name: companyName || null,
        address: address || null,
        currency,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-settings", user?.id] });
      toast.success("Settings saved");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save settings"),
  });

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>Account & Company Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div>
              <Label htmlFor="display">Display name</Label>
              <Input id="display" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="company">Company name</Label>
              <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="addr">Address</Label>
              <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={save.isPending}>Save Settings</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
};

export default Settings;
