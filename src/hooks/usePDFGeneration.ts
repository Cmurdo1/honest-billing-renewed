import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { downloadInvoicePDF, InvoiceData, CompanySettings } from '@/lib/pdf-generator';
import { toast } from 'sonner';

export const usePDFGeneration = () => {
  const { user } = useAuth();

  // Fetch user settings for PDF generation
  const { data: userSettings } = useQuery({
    queryKey: ['user-settings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const generatePDF = useMutation({
    mutationFn: async (invoiceId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Fetch invoice with client and items
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          client:clients(name, email, company, address)
        `)
        .eq('id', invoiceId)
        .eq('user_id', user.id)
        .single();

      if (invoiceError) throw invoiceError;

      // Fetch invoice items
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('position');

      if (itemsError) throw itemsError;

      // Prepare invoice data for PDF
      const invoiceData: InvoiceData = {
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        total: invoice.total,
        notes: invoice.notes,
        client: {
          name: invoice.client.name,
          email: invoice.client.email,
          company: invoice.client.company,
          address: invoice.client.address,
        },
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount || (item.quantity * item.unit_price),
        })),
      };

      // Prepare company settings for PDF
      const companySettings: CompanySettings = userSettings ? {
        company_name: userSettings.company_name,
        company_logo_url: userSettings.company_logo_url,
        address: userSettings.address,
        phone: userSettings.phone,
        website: userSettings.website,
        invoice_terms: userSettings.invoice_terms,
        invoice_footer: userSettings.invoice_footer,
      } : {};

      // Generate and download PDF
      await downloadInvoicePDF(invoiceData, companySettings);
    },
    onSuccess: () => {
      toast.success('PDF generated successfully');
    },
    onError: (error: any) => {
      console.error('PDF generation error:', error);
      toast.error(error.message || 'Failed to generate PDF');
    },
  });

  return {
    generatePDF: generatePDF.mutate,
    isGenerating: generatePDF.isPending,
  };
};
