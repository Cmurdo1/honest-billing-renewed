import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SendEmailParams {
  invoiceId: string;
  recipientEmail?: string;
  subject?: string;
  message?: string;
}

export const useEmailSending = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const sendInvoiceEmail = useMutation({
    mutationFn: async ({ invoiceId, recipientEmail, subject, message }: SendEmailParams) => {
      if (!user) throw new Error('Not authenticated');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invoice-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            invoice_id: invoiceId,
            recipient_email: recipientEmail,
            subject,
            message,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Invoice email sent to ${data.recipient}`);
      // Invalidate invoices query to refresh status
      queryClient.invalidateQueries({ queryKey: ['invoices', user?.id] });
    },
    onError: (error: any) => {
      console.error('Email sending error:', error);
      toast.error(error.message || 'Failed to send invoice email');
    },
  });

  return {
    sendEmail: sendInvoiceEmail.mutate,
    isSending: sendInvoiceEmail.isPending,
  };
};
