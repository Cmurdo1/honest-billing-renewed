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
    console.log('Received invoiceId:', invoiceId);
    
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

<<<<<<< HEAD
    // First, try basic invoice query
    console.log('Querying invoice...');
    const { data: invoiceData, error: invoiceError } = await supabase
=======
    // 1. Get invoice
    const { data: invoice, error: invoiceError } = await supabase
>>>>>>> fix-invoice-pdf-email
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

<<<<<<< HEAD
    if (invoiceError) {
      console.error('Invoice query error:', invoiceError);
      throw new Error(`Invoice query failed: ${invoiceError.message}`);
    }

    if (!invoiceData) {
      console.error('No invoice found with ID:', invoiceId);
      throw new Error('Invoice not found in database');
    }

    console.log('Invoice found:', invoiceData);

    // Get client details
    console.log('Querying client...');
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('name, email, company')
      .eq('id', invoiceData.client_id)
      .single();

    if (clientError) {
      console.error('Client query error:', clientError);
    }

    // Get user settings
    console.log('Querying user settings...');
    const { data: userSettings, error: userError } = await supabase
      .from('user_settings')
      .select('display_name, company_name')
      .eq('user_id', invoiceData.user_id)
      .single();

    if (userError) {
      console.error('User settings query error:', userError);
    }

    const invoice = {
      ...invoiceData,
      client: clientData
    };

    if (!invoice.client?.email) {
=======
    if (invoiceError || !invoice) {
      throw new Error(`Invoice not found: ${invoiceError?.message}`);
    }

    // 2. Get client details
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name, email, company')
      .eq('id', invoice.client_id)
      .single();

    if (clientError || !client) {
      throw new Error(`Client not found for invoice: ${clientError?.message}`);
    }

    // 3. Get user settings
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('display_name, company_name')
      .eq('user_id', invoice.user_id)
      .single();

    if (settingsError) {
      console.error('Could not fetch user settings:', settingsError.message);
    }

    if (!client.email) {
>>>>>>> fix-invoice-pdf-email
      throw new Error('Client email not found');
    }

    const companyName = userSettings?.company_name || userSettings?.display_name || 'Your Business';

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
      from: 'noreply@yourdomain.com', // TODO: Replace with your verified Resend domain
      to: [client.email],
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