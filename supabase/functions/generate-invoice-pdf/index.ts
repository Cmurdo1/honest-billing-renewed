import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First, try basic invoice query
    console.log('Querying invoice...');
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

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
      .select('name, email, company, address')
      .eq('id', invoiceData.client_id)
      .single();

    if (clientError) {
      console.error('Client query error:', clientError);
    }

    // Get user settings
    console.log('Querying user settings...');
    const { data: userSettings, error: userError } = await supabase
      .from('user_settings')
      .select('display_name, company_name, address')
      .eq('user_id', invoiceData.user_id)
      .single();

    if (userError) {
      console.error('User settings query error:', userError);
    }

    const invoice = {
      ...invoiceData,
      client: clientData
    };

    const companyName = userSettings?.company_name || userSettings?.display_name || 'Your Business';
    const companyAddress = userSettings?.address || '';
    const clientName = invoice.client?.name || 'Client';
    const clientCompany = invoice.client?.company || '';
    const clientAddress = invoice.client?.address || '';

    // Generate HTML for PDF
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .company-info, .client-info { width: 45%; }
          .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .invoice-table th, .invoice-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .invoice-table th { background-color: #f2f2f2; }
          .totals { text-align: right; }
          .total-row { font-weight: bold; font-size: 18px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <h2>#${invoice.number}</h2>
        </div>
        
        <div class="invoice-details">
          <div class="company-info">
            <h3>From:</h3>
            <p><strong>${companyName}</strong></p>
            <p>${companyAddress}</p>
          </div>
          
          <div class="client-info">
            <h3>Bill To:</h3>
            <p><strong>${clientName}</strong></p>
            <p>${clientCompany}</p>
            <p>${clientAddress}</p>
            <p>${invoice.client?.email || ''}</p>
          </div>
        </div>
        
        <table class="invoice-table">
          <thead>
            <tr>
              <th>Date Issued</th>
              <th>Due Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${new Date(invoice.issue_date).toLocaleDateString()}</td>
              <td>${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'No due date'}</td>
              <td style="text-transform: capitalize;">${invoice.status}</td>
            </tr>
          </tbody>
        </table>
        
        <table class="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Subtotal</td>
              <td>$${Number(invoice.subtotal).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Tax</td>
              <td>$${Number(invoice.tax).toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td><strong>Total</strong></td>
              <td><strong>$${Number(invoice.total).toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <div style="margin-top: 40px; text-align: center; color: #666;">
          <p>Thank you for your business!</p>
        </div>
      </body>
      </html>
    `;

    // Convert HTML to PDF - simplified version returns HTML for now
    // For production PDF generation, consider using a different approach
    const htmlContent = html;

    return new Response(htmlContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="invoice-${invoice.number}.html"`
      }
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});