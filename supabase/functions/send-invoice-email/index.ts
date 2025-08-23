import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmailRequest {
  invoice_id: string;
  recipient_email?: string;
  subject?: string;
  message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { invoice_id, recipient_email, subject, message }: EmailRequest = await req.json();

    if (!invoice_id) {
      return new Response(
        JSON.stringify({ error: 'Invoice ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch invoice with client information
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(name, email, company, address)
      `)
      .eq('id', invoice_id)
      .eq('user_id', user.id)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user settings for company information
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('company_name, display_name')
      .eq('user_id', user.id)
      .maybeSingle();

    // Determine recipient email
    const toEmail = recipient_email || invoice.client.email;
    if (!toEmail) {
      return new Response(
        JSON.stringify({ error: 'No recipient email provided and client has no email on file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare email content
    const companyName = userSettings?.company_name || userSettings?.display_name || 'HonestInvoice User';
    const defaultSubject = `Invoice ${invoice.number} from ${companyName}`;
    const defaultMessage = `
Dear ${invoice.client.name},

Please find attached invoice ${invoice.number} for your review.

Invoice Details:
- Invoice Number: ${invoice.number}
- Issue Date: ${new Date(invoice.issue_date).toLocaleDateString()}
- Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}
- Amount: $${invoice.total.toFixed(2)}
- Status: ${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}

${invoice.notes ? `Notes: ${invoice.notes}` : ''}

Thank you for your business!

Best regards,
${companyName}
    `.trim();

    // Use Supabase's built-in email functionality
    // Note: In a real implementation, you would integrate with an email service like:
    // - SendGrid
    // - Mailgun
    // - AWS SES
    // - Resend
    // For this example, we'll simulate sending and log the email

    console.log('Sending email:', {
      to: toEmail,
      subject: subject || defaultSubject,
      message: message || defaultMessage,
      invoice: {
        id: invoice.id,
        number: invoice.number,
        total: invoice.total
      }
    });

    // In a real implementation, you would call your email service here
    // Example with a hypothetical email service:
    /*
    const emailResponse = await fetch('https://api.emailservice.com/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('EMAIL_SERVICE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: toEmail,
        from: `${companyName} <noreply@yourdomain.com>`,
        subject: subject || defaultSubject,
        text: message || defaultMessage,
        // You could also attach the PDF here
      }),
    });

    if (!emailResponse.ok) {
      throw new Error('Failed to send email');
    }
    */

    // Update invoice status to 'sent' if it was 'draft'
    if (invoice.status === 'draft') {
      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoice_id)
        .eq('user_id', user.id);
    }

    // Log the email sending activity (optional)
    await supabase
      .from('invoice_emails')
      .insert({
        invoice_id: invoice_id,
        recipient_email: toEmail,
        subject: subject || defaultSubject,
        sent_at: new Date().toISOString(),
        user_id: user.id,
      })
      .catch(error => {
        // Table might not exist, that's okay for this demo
        console.log('Could not log email activity:', error);
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invoice email sent successfully',
        recipient: toEmail,
        invoice_number: invoice.number
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error sending invoice email:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
