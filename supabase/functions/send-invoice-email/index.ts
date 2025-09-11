import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoiceId } = await req.json();
    
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get invoice with client details
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(name, email, company),
        user_settings(display_name, company_name)
      `)
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      throw new Error('Invoice not found');
    }

    if (!invoice.client?.email) {
      throw new Error('Client email not found');
    }

    const companyName = invoice.user_settings?.[0]?.company_name || invoice.user_settings?.[0]?.display_name || 'Your Business';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">Invoice from ${companyName}</h2>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Invoice Details</h3>
          <p><strong>Invoice Number:</strong> ${invoice.number}</p>
          <p><strong>Date Issued:</strong> ${new Date(invoice.issue_date).toLocaleDateString()}</p>
          <p><strong>Due Date:</strong> ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'No due date'}</p>
          <p><strong>Status:</strong> <span style="text-transform: capitalize;">${invoice.status}</span></p>
        </div>
        
        <div style="background: #fff; border: 2px solid #e5e5e5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Amount Due</h3>
          <div style="display: flex; justify-content: space-between; margin: 10px 0;">
            <span>Subtotal:</span>
            <span>$${Number(invoice.subtotal).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 10px 0;">
            <span>Tax:</span>
            <span>$${Number(invoice.tax).toFixed(2)}</span>
          </div>
          <hr style="margin: 15px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #333;">
            <span>Total:</span>
            <span>$${Number(invoice.total).toFixed(2)}</span>
          </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0; color: #666;">
          <p>Thank you for your business!</p>
          <p style="font-size: 14px;">Please contact us if you have any questions about this invoice.</p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: 'invoices@resend.dev', // You'll need to configure this with your verified domain
      to: [invoice.client.email],
      subject: `Invoice ${invoice.number} from ${companyName}`,
      html: emailHtml,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});