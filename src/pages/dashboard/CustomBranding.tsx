import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, Palette, Save } from "lucide-react";
import ProFeatureGate from "@/components/ProFeatureGate";
import { toast } from "sonner";

const CustomBranding = () => {
  const [formData, setFormData] = useState({
    companyName: "",
    tagline: "",
    primaryColor: "#3b82f6",
    secondaryColor: "#64748b",
    logoUrl: "",
    footerText: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would save to the database
    toast.success("Branding settings saved successfully!");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, this would upload to storage
      const url = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, logoUrl: url }));
      toast.success("Logo uploaded successfully!");
    }
  };

  return (
    <ProFeatureGate 
      featureName="Custom Branding" 
      description="Customize your invoices with your company logo, colors, and branding to create a professional appearance."
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Palette className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Custom Branding</h2>
          <Badge variant="secondary" className="ml-2">Pro Feature</Badge>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Set up your company details for invoices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Your Company Name"
                  />
                </div>
                <div>
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={formData.tagline}
                    onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                    placeholder="Your company tagline"
                  />
                </div>
                <div>
                  <Label htmlFor="footerText">Invoice Footer Text</Label>
                  <Textarea
                    id="footerText"
                    value={formData.footerText}
                    onChange={(e) => setFormData(prev => ({ ...prev, footerText: e.target.value }))}
                    placeholder="Thank you for your business..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Logo & Colors */}
            <Card>
              <CardHeader>
                <CardTitle>Visual Branding</CardTitle>
                <CardDescription>
                  Upload your logo and customize colors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Company Logo</Label>
                  <div className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 transition-colors rounded-lg p-6 text-center">
                    {formData.logoUrl ? (
                      <div className="space-y-2">
                        <img 
                          src={formData.logoUrl} 
                          alt="Company Logo" 
                          className="max-h-16 mx-auto"
                        />
                        <p className="text-sm text-muted-foreground">Logo uploaded</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Upload your company logo
                        </p>
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        id="primaryColor"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={formData.primaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        id="secondaryColor"
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        placeholder="#64748b"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Preview</CardTitle>
              <CardDescription>
                See how your branding will look on invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-6 bg-white dark:bg-gray-900" style={{ 
                borderColor: formData.primaryColor,
                borderWidth: '2px'
              }}>
                <div className="flex justify-between items-start mb-6">
                  {formData.logoUrl && (
                    <img src={formData.logoUrl} alt="Logo" className="max-h-12" />
                  )}
                  <div className="text-right">
                    <h3 className="text-xl font-bold" style={{ color: formData.primaryColor }}>
                      {formData.companyName || "Your Company"}
                    </h3>
                    {formData.tagline && (
                      <p className="text-sm" style={{ color: formData.secondaryColor }}>
                        {formData.tagline}
                      </p>
                    )}
                  </div>
                </div>
                <div className="border-t pt-4" style={{ borderColor: formData.secondaryColor }}>
                  <h4 className="font-semibold mb-2">INVOICE #001</h4>
                  <p className="text-sm text-muted-foreground">Sample invoice content...</p>
                </div>
                {formData.footerText && (
                  <div className="mt-6 pt-4 border-t text-center text-sm" style={{ 
                    borderColor: formData.secondaryColor,
                    color: formData.secondaryColor 
                  }}>
                    {formData.footerText}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Branding Settings
            </Button>
          </div>
        </form>
      </div>
    </ProFeatureGate>
  );
};

export default CustomBranding;