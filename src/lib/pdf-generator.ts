// PDF generation utility for invoices
// Note: This is a client-side implementation using jsPDF
// For production, consider server-side PDF generation for better performance and security

import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface InvoiceData {
  id: string;
  number: string;
  status: string;
  issue_date: string;
  due_date?: string;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  client: {
    name: string;
    email?: string;
    company?: string;
    address?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }>;
}

export interface CompanySettings {
  company_name?: string;
  company_logo_url?: string;
  address?: string;
  phone?: string;
  website?: string;
  invoice_terms?: string;
  invoice_footer?: string;
}

export const generateInvoicePDF = async (
  invoice: InvoiceData,
  companySettings?: CompanySettings
): Promise<Blob> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Colors
  const primaryColor = [76, 175, 80]; // Green
  const textColor = [51, 51, 51];
  const lightGray = [245, 245, 245];
  
  let yPosition = 20;
  
  // Header Section
  doc.setFontSize(24);
  doc.setTextColor(...primaryColor);
  doc.text('INVOICE', 20, yPosition);
  
  // Company Info (right side)
  if (companySettings?.company_name) {
    doc.setFontSize(16);
    doc.setTextColor(...textColor);
    const companyNameWidth = doc.getTextWidth(companySettings.company_name);
    doc.text(companySettings.company_name, pageWidth - 20 - companyNameWidth, yPosition);
    yPosition += 8;
    
    if (companySettings.address) {
      doc.setFontSize(10);
      const addressLines = companySettings.address.split('\n');
      addressLines.forEach(line => {
        const lineWidth = doc.getTextWidth(line);
        doc.text(line, pageWidth - 20 - lineWidth, yPosition);
        yPosition += 5;
      });
    }
    
    if (companySettings.phone) {
      doc.setFontSize(10);
      const phoneWidth = doc.getTextWidth(companySettings.phone);
      doc.text(companySettings.phone, pageWidth - 20 - phoneWidth, yPosition);
      yPosition += 5;
    }
    
    if (companySettings.website) {
      doc.setFontSize(10);
      const websiteWidth = doc.getTextWidth(companySettings.website);
      doc.text(companySettings.website, pageWidth - 20 - websiteWidth, yPosition);
    }
  }
  
  yPosition = 60;
  
  // Invoice Details
  doc.setFontSize(12);
  doc.setTextColor(...textColor);
  doc.text(`Invoice #: ${invoice.number}`, 20, yPosition);
  doc.text(`Date: ${new Date(invoice.issue_date).toLocaleDateString()}`, 20, yPosition + 8);
  if (invoice.due_date) {
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 20, yPosition + 16);
  }
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 20, yPosition + 24);
  
  // Client Information
  yPosition += 40;
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('Bill To:', 20, yPosition);
  
  yPosition += 10;
  doc.setFontSize(12);
  doc.setTextColor(...textColor);
  doc.text(invoice.client.name, 20, yPosition);
  
  if (invoice.client.company) {
    yPosition += 8;
    doc.text(invoice.client.company, 20, yPosition);
  }
  
  if (invoice.client.address) {
    yPosition += 8;
    const addressLines = invoice.client.address.split('\n');
    addressLines.forEach(line => {
      doc.text(line, 20, yPosition);
      yPosition += 6;
    });
  }
  
  if (invoice.client.email) {
    yPosition += 8;
    doc.text(invoice.client.email, 20, yPosition);
  }
  
  yPosition += 20;
  
  // Items Table
  const tableColumns = ['Description', 'Qty', 'Unit Price', 'Amount'];
  const tableRows = invoice.items.map(item => [
    item.description,
    item.quantity.toString(),
    `$${item.unit_price.toFixed(2)}`,
    `$${item.amount.toFixed(2)}`
  ]);
  
  doc.autoTable({
    startY: yPosition,
    head: [tableColumns],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 12,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 10,
      textColor: textColor
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' }
    },
    margin: { left: 20, right: 20 }
  });
  
  // Get the final Y position after the table
  yPosition = (doc as any).lastAutoTable.finalY + 20;
  
  // Totals Section
  const totalsX = pageWidth - 80;
  doc.setFontSize(12);
  doc.text('Subtotal:', totalsX - 40, yPosition);
  doc.text(`$${invoice.subtotal.toFixed(2)}`, totalsX, yPosition);
  
  yPosition += 10;
  doc.text('Tax:', totalsX - 40, yPosition);
  doc.text(`$${invoice.tax.toFixed(2)}`, totalsX, yPosition);
  
  yPosition += 10;
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Total:', totalsX - 40, yPosition);
  doc.text(`$${invoice.total.toFixed(2)}`, totalsX, yPosition);
  
  // Notes Section
  if (invoice.notes) {
    yPosition += 30;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...primaryColor);
    doc.text('Notes:', 20, yPosition);
    
    yPosition += 10;
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 40);
    doc.text(notesLines, 20, yPosition);
    yPosition += notesLines.length * 5;
  }
  
  // Terms Section
  if (companySettings?.invoice_terms) {
    yPosition += 20;
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text('Terms & Conditions:', 20, yPosition);
    
    yPosition += 10;
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    const termsLines = doc.splitTextToSize(companySettings.invoice_terms, pageWidth - 40);
    doc.text(termsLines, 20, yPosition);
    yPosition += termsLines.length * 5;
  }
  
  // Footer
  if (companySettings?.invoice_footer) {
    const footerY = pageHeight - 30;
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    const footerWidth = doc.getTextWidth(companySettings.invoice_footer);
    doc.text(companySettings.invoice_footer, (pageWidth - footerWidth) / 2, footerY);
  }
  
  // Return as blob for download
  return doc.output('blob');
};

export const downloadInvoicePDF = async (
  invoice: InvoiceData,
  companySettings?: CompanySettings
) => {
  try {
    const pdfBlob = await generateInvoicePDF(invoice, companySettings);
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${invoice.number}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
};
