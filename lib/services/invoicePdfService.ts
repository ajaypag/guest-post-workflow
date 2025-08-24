import jsPDF from 'jspdf';

interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  billingInfo?: {
    name: string;
    company: string;
    email: string;
    address?: string;
  };
}

interface OrderData {
  id: string;
  accountId: string;
  status: string;
  state: string;
}

export class InvoicePdfService {
  /**
   * Generate a PDF invoice and return as buffer
   */
  static generateInvoicePdf(invoice: InvoiceData, order: OrderData): Buffer {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Company Header
    doc.setFontSize(24);
    doc.setTextColor(33, 37, 41);
    doc.text('Linkio', 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(108, 117, 125);
    doc.text('Invoice', 20, 27);

    // Invoice Number and Date (Right side)
    doc.setFontSize(10);
    doc.setTextColor(33, 37, 41);
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, 140, 20);
    doc.text(`Date: ${invoice.issueDate}`, 140, 26);
    doc.text(`Due: ${invoice.dueDate}`, 140, 32);
    doc.text(`Order ID: ${order.id.substring(0, 8)}`, 140, 38);

    // Billing Information
    let yPos = 50;
    doc.setFontSize(12);
    doc.setTextColor(33, 37, 41);
    doc.text('Bill To:', 20, yPos);
    
    yPos += 7;
    doc.setFontSize(10);
    if (invoice.billingInfo) {
      if (invoice.billingInfo.company) {
        doc.setFont(undefined, 'bold');
        doc.text(invoice.billingInfo.company, 20, yPos);
        yPos += 5;
        doc.setFont(undefined, 'normal');
      }
      if (invoice.billingInfo.name) {
        doc.text(invoice.billingInfo.name, 20, yPos);
        yPos += 5;
      }
      doc.text(invoice.billingInfo.email, 20, yPos);
      yPos += 5;
      if (invoice.billingInfo.address) {
        const addressLines = invoice.billingInfo.address.split('\n');
        addressLines.forEach(line => {
          doc.text(line, 20, yPos);
          yPos += 5;
        });
      }
    }

    // Items Table Header
    yPos = 90;
    doc.setFillColor(248, 249, 250);
    doc.rect(20, yPos - 5, 170, 8, 'F');
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(33, 37, 41);
    doc.text('Description', 22, yPos);
    doc.text('Qty', 120, yPos, { align: 'right' });
    doc.text('Unit Price', 150, yPos, { align: 'right' });
    doc.text('Total', 188, yPos, { align: 'right' });

    // Items
    yPos += 10;
    doc.setFont(undefined, 'normal');
    doc.setTextColor(73, 80, 87);
    
    invoice.items.forEach((item, index) => {
      // Add alternating row backgrounds
      if (index % 2 === 0) {
        doc.setFillColor(252, 252, 253);
        doc.rect(20, yPos - 5, 170, 7, 'F');
      }
      
      // Truncate long descriptions
      const maxDescLength = 60;
      const description = item.description.length > maxDescLength 
        ? item.description.substring(0, maxDescLength) + '...'
        : item.description;
      
      doc.text(description, 22, yPos);
      doc.text(item.quantity.toString(), 120, yPos, { align: 'right' });
      doc.text(`$${(item.unitPrice / 100).toFixed(2)}`, 150, yPos, { align: 'right' });
      doc.text(`$${(item.total / 100).toFixed(2)}`, 188, yPos, { align: 'right' });
      
      yPos += 7;
    });

    // Totals section
    yPos += 10;
    
    // Draw line above totals
    doc.setDrawColor(220, 220, 220);
    doc.line(120, yPos - 5, 190, yPos - 5);
    
    doc.setFont(undefined, 'normal');
    doc.setTextColor(73, 80, 87);
    doc.text('Subtotal:', 140, yPos, { align: 'right' });
    doc.text(`$${(invoice.subtotal / 100).toFixed(2)}`, 188, yPos, { align: 'right' });
    
    if (invoice.discount > 0) {
      yPos += 6;
      doc.setTextColor(220, 53, 69);
      doc.text('Discount:', 140, yPos, { align: 'right' });
      doc.text(`-$${(invoice.discount / 100).toFixed(2)}`, 188, yPos, { align: 'right' });
    }
    
    yPos += 8;
    doc.setDrawColor(220, 220, 220);
    doc.line(120, yPos - 5, 190, yPos - 5);
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(33, 37, 41);
    doc.text('Total:', 140, yPos, { align: 'right' });
    doc.setTextColor(40, 167, 69);
    doc.text(`$${(invoice.total / 100).toFixed(2)} USD`, 188, yPos, { align: 'right' });

    // Payment Status
    yPos += 15;
    const isPaid = order.status === 'paid' || order.state === 'payment_received';
    
    if (isPaid) {
      doc.setFillColor(40, 167, 69);
      doc.setTextColor(255, 255, 255);
      doc.rect(20, yPos - 5, 40, 8, 'F');
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('PAID', 40, yPos, { align: 'center' });
    } else {
      doc.setFillColor(255, 193, 7);
      doc.setTextColor(255, 255, 255);
      doc.rect(20, yPos - 5, 60, 8, 'F');
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('PAYMENT PENDING', 50, yPos, { align: 'center' });
    }

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(108, 117, 125);
    doc.setFont(undefined, 'normal');
    doc.text('Thank you for your business!', 105, pageHeight - 30, { align: 'center' });
    doc.text('For questions about this invoice, please contact: info@linkio.com', 105, pageHeight - 25, { align: 'center' });
    doc.text(`Page 1 of 1`, 105, pageHeight - 15, { align: 'center' });

    // Convert to buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    return pdfBuffer;
  }

  /**
   * Generate a PDF invoice and return as base64 string
   */
  static generateInvoicePdfBase64(invoice: InvoiceData, order: OrderData): string {
    const buffer = this.generateInvoicePdf(invoice, order);
    return buffer.toString('base64');
  }

  /**
   * Generate a PDF invoice and return as data URL for direct download
   */
  static generateInvoicePdfDataUrl(invoice: InvoiceData, order: OrderData): string {
    const base64 = this.generateInvoicePdfBase64(invoice, order);
    return `data:application/pdf;base64,${base64}`;
  }
}