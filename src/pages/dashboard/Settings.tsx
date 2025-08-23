import { useEffect, useState } from "react";
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
import { userSettingsSchema, UserSettingsFormData } from "@/lib/validations";

const sb = supabase as any;

const Settings = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [formData, setFormData] = useState<UserSettingsFormData>({
    display_name: "",
    company_name: "",
    company_logo_url: "",
    address: "",
    phone: "",
    website: "",
    currency: "USD",
    tax_rate: 0,
    invoice_terms: "",
    invoice_footer: "",
  });

  const settings = useQuery({
    queryKey: ["user-settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings.data) {
      setFormData({
        display_name: settings.data.display_name || "",
        company_name: settings.data.company_name || "",
        company_logo_url: settings.data.company_logo_url || "",
        address: settings.data.address || "",
        phone: settings.data.phone || "",
        website: settings.data.website || "",
        currency: settings.data.currency || "USD",
        tax_rate: settings.data.tax_rate || 0,
        invoice_terms: settings.data.invoice_terms || "",
        invoice_footer: settings.data.invoice_footer || "",
      });
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      // Validate form data
      const validation = userSettingsSchema.safeParse(formData);
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      const { error } = await supabase.from("user_settings").upsert({
        user_id: user.id,
        ...validation.data,
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
              <Input
                id="display"
                value={formData.display_name || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="company">Company name</Label>
              <Input
                id="company"
                value={formData.company_name || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="addr">Address</Label>
              <Textarea
                id="addr"
                value={formData.address || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Company address"
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
              >
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
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <Label htmlFor="tax">Default tax rate (%)</Label>
              <Input
                id="tax"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.tax_rate || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, tax_rate: Number(e.target.value) }))}
                placeholder="0.00"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="logo">Company logo URL</Label>
              <Input
                id="logo"
                type="url"
                value={formData.company_logo_url || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, company_logo_url: e.target.value }))}
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="terms">Default invoice terms</Label>
              <Textarea
                id="terms"
                value={formData.invoice_terms || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_terms: e.target.value }))}
                placeholder="Payment terms and conditions"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="footer">Default invoice footer</Label>
              <Textarea
                id="footer"
                value={formData.invoice_footer || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_footer: e.target.value }))}
                placeholder="Thank you for your business!"
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
};

export default Settings;
