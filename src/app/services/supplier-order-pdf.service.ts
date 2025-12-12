import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import type { Content, TableCell, TDocumentDefinitions, ContentTable, DynamicContent } from 'pdfmake/interfaces';
import { SupplierOrder } from '../models/supplier-order.model';
import { SupplierOrderItem } from '../models/supplier-order-item.model';
import { Supplier } from '../models/supplier.model';
import { DeliveryAddress } from '../models/delivery-address.model';

/**
 * Payload for generating supplier order PDFs
 */
export interface SupplierOrderPdfPayload {
  order: SupplierOrder;
  items: SupplierOrderItem[];
  supplier: Supplier | null;
  deliveryAddress: DeliveryAddress | null;
  companyName?: string;
  companyLogoUrl?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
}

@Injectable({ providedIn: 'root' })
export class SupplierOrderPdfService {
  private readonly accentColor = '#3b82f6';
  private readonly headerBgColor = '#f8fafc';
  private readonly borderColor = '#e2e8f0';

  private readonly currencyFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  });

  private readonly quantityFormatter = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  private fontsRegistered = false;

  /**
   * Downloads the supplier order as a PDF file
   */
  async downloadOrderPdf(payload: SupplierOrderPdfPayload): Promise<void> {
    if (typeof window === 'undefined') {
      console.warn('PDF generation is only available in browser.');
      return;
    }

    this.ensureFontsRegistered();
    const definition = this.buildDocumentDefinition(payload);
    const fileName = this.buildFileName(payload);

    await new Promise<void>((resolve, reject) => {
      try {
        pdfMake.createPdf(definition).download(fileName, () => resolve());
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Opens the supplier order PDF in a new browser tab
   */
  async openOrderPdf(payload: SupplierOrderPdfPayload): Promise<void> {
    if (typeof window === 'undefined') {
      console.warn('PDF generation is only available in browser.');
      return;
    }

    this.ensureFontsRegistered();
    const definition = this.buildDocumentDefinition(payload);

    try {
      pdfMake.createPdf(definition).open();
    } catch (error) {
      console.error('Error opening PDF:', error);
    }
  }

  /**
   * Generates PDF as blob URL (useful for preview)
   */
  async getOrderPdfBlobUrl(payload: SupplierOrderPdfPayload): Promise<string> {
    if (typeof window === 'undefined') {
      return '';
    }

    this.ensureFontsRegistered();
    const definition = this.buildDocumentDefinition(payload);

    return new Promise((resolve, reject) => {
      try {
        const pdfDocGenerator = pdfMake.createPdf(definition);
        pdfDocGenerator.getBlob((blob) => {
          const url = URL.createObjectURL(blob);
          resolve(url);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generates PDF as base64 string (useful for email attachments)
   */
  async getOrderPdfBase64(payload: SupplierOrderPdfPayload): Promise<{ base64: string; sizeInMB: number }> {
    if (typeof window === 'undefined') {
      return { base64: '', sizeInMB: 0 };
    }

    this.ensureFontsRegistered();
    const definition = this.buildDocumentDefinition(payload);

    return new Promise((resolve, reject) => {
      try {
        const pdfDocGenerator = pdfMake.createPdf(definition);
        pdfDocGenerator.getBase64((base64) => {
          const binarySize = base64.length * 0.75;
          const sizeInMB = binarySize / (1024 * 1024);
          resolve({ base64, sizeInMB });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private ensureFontsRegistered(): void {
    if (this.fontsRegistered) return;

    const fonts = pdfFonts as unknown as { pdfMake?: { vfs?: unknown } };
    const vfs = fonts?.pdfMake?.vfs;

    if (!vfs) {
      console.warn('Could not load embedded pdfMake fonts.');
      return;
    }

    pdfMake.vfs = vfs as Record<string, string>;
    pdfMake.fonts = {
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf'
      }
    };

    this.fontsRegistered = true;
  }

  private buildFileName(payload: SupplierOrderPdfPayload): string {
    const orderNumber = payload.order.orderNumber.replace(/[^a-zA-Z0-9]/g, '-');
    const supplierName = payload.supplier?.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'proveedor';
    return `Pedido_${orderNumber}_${supplierName}.pdf`;
  }

  private buildDocumentDefinition(payload: SupplierOrderPdfPayload): TDocumentDefinitions {
    const { order, items, supplier, deliveryAddress } = payload;

    const content: Content[] = [];

    // Header section
    content.push(this.buildHeader(payload));
    content.push({ text: '', margin: [0, 15, 0, 0] });

    // Order info boxes
    content.push(this.buildInfoBoxes(order, supplier, deliveryAddress));
    content.push({ text: '', margin: [0, 20, 0, 0] });

    // Products table
    content.push(this.buildProductsSection(items, order));

    // Notes section
    if (order.notes) {
      content.push({ text: '', margin: [0, 20, 0, 0] });
      content.push(this.buildNotesSection(order.notes));
    }

    return {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 60],
      content,
      footer: this.buildFooter(payload),
      defaultStyle: {
        font: 'Roboto',
        fontSize: 9,
        lineHeight: 1.3
      },
      styles: this.getStyles()
    };
  }

  private buildHeader(payload: SupplierOrderPdfPayload): Content {
    const { order, companyName = 'ENTRECUINES' } = payload;

    return {
      columns: [
        {
          width: '*',
          stack: [
            { 
              text: companyName, 
              fontSize: 22, 
              bold: true, 
              color: this.accentColor,
              characterSpacing: 2 
            },
            { 
              text: 'PEDIDO A PROVEEDOR', 
              fontSize: 11, 
              color: '#64748b',
              marginTop: 4,
              characterSpacing: 1
            }
          ]
        },
        {
          width: 'auto',
          alignment: 'right' as const,
          stack: [
            { 
              text: order.orderNumber, 
              fontSize: 16, 
              bold: true, 
              color: '#1e293b' 
            },
            { 
              text: this.formatDate(order.createdAt), 
              fontSize: 10, 
              color: '#64748b',
              marginTop: 4
            },
            this.buildStatusBadge(order.status)
          ]
        }
      ]
    };
  }

  private buildStatusBadge(status: string): Content {
    const statusConfig: Record<string, { text: string; color: string; bg: string }> = {
      draft: { text: 'BORRADOR', color: '#92400e', bg: '#fef3c7' },
      sent: { text: 'ENVIADO', color: '#1e40af', bg: '#dbeafe' },
      delivered: { text: 'ENTREGADO', color: '#065f46', bg: '#d1fae5' }
    };

    const config = statusConfig[status] || statusConfig['draft'];

    return {
      table: {
        widths: ['auto'],
        body: [[
          { 
            text: config.text, 
            fontSize: 8, 
            bold: true, 
            color: config.color,
            fillColor: config.bg,
            margin: [8, 3, 8, 3]
          }
        ]]
      },
      layout: 'noBorders',
      marginTop: 8,
      alignment: 'right' as const
    };
  }

  private buildInfoBoxes(
    order: SupplierOrder, 
    supplier: Supplier | null, 
    deliveryAddress: DeliveryAddress | null
  ): Content {
    const supplierContent: Content[] = [
      { text: 'PROVEEDOR', style: 'boxTitle' }
    ];

    if (supplier) {
      supplierContent.push({ text: supplier.name, style: 'boxValue' });
      if (supplier.contactName) {
        supplierContent.push({ text: `Contacto: ${supplier.contactName}`, style: 'boxDetail' });
      }
      if (supplier.email) {
        supplierContent.push({ text: supplier.email, style: 'boxDetail' });
      }
      if (supplier.phone) {
        supplierContent.push({ text: supplier.phone, style: 'boxDetail' });
      }
    } else {
      supplierContent.push({ text: 'No especificado', style: 'boxDetail', italics: true });
    }

    const deliveryContent: Content[] = [
      { text: 'DIRECCIÓN DE ENTREGA', style: 'boxTitle' }
    ];

    if (deliveryAddress) {
      deliveryContent.push({ text: deliveryAddress.name, style: 'boxValue' });
      deliveryContent.push({ text: deliveryAddress.address, style: 'boxDetail' });
      if (deliveryAddress.city || deliveryAddress.postalCode) {
        deliveryContent.push({ 
          text: `${deliveryAddress.postalCode || ''} ${deliveryAddress.city || ''}`.trim(), 
          style: 'boxDetail' 
        });
      }
      if (deliveryAddress.province) {
        deliveryContent.push({ text: deliveryAddress.province, style: 'boxDetail' });
      }
      if (deliveryAddress.contactName || deliveryAddress.contactPhone) {
        deliveryContent.push({ 
          text: `${deliveryAddress.contactName || ''} ${deliveryAddress.contactPhone ? '· ' + deliveryAddress.contactPhone : ''}`.trim(), 
          style: 'boxDetail',
          marginTop: 4
        });
      }
    } else if (order.customDeliveryAddress) {
      deliveryContent.push({ text: order.customDeliveryAddress, style: 'boxDetail' });
    } else {
      deliveryContent.push({ text: 'No especificada', style: 'boxDetail', italics: true });
    }

    const referenceContent: Content[] = [
      { text: 'REFERENCIA', style: 'boxTitle' }
    ];

    if (order.customerReference) {
      referenceContent.push({ text: order.customerReference, style: 'boxValue' });
    }
    if (order.deliveryDate) {
      referenceContent.push({ 
        text: `Fecha entrega: ${this.formatDate(order.deliveryDate)}`, 
        style: 'boxDetail',
        marginTop: 4
      });
    }
    if (!order.customerReference && !order.deliveryDate) {
      referenceContent.push({ text: '-', style: 'boxDetail' });
    }

    return {
      columns: [
        {
          width: '*',
          stack: supplierContent,
          style: 'infoBox'
        },
        { width: 15, text: '' },
        {
          width: '*',
          stack: deliveryContent,
          style: 'infoBox'
        },
        { width: 15, text: '' },
        {
          width: 120,
          stack: referenceContent,
          style: 'infoBox'
        }
      ]
    };
  }

  private buildProductsSection(items: SupplierOrderItem[], order: SupplierOrder): Content {
    const tableBody: TableCell[][] = [];

    // Header row
    tableBody.push([
      { text: 'REF.', style: 'tableHeader', alignment: 'left' as const },
      { text: 'CONCEPTO', style: 'tableHeader', alignment: 'left' as const },
      { text: 'CANT.', style: 'tableHeader', alignment: 'center' as const },
      { text: 'UNIDAD', style: 'tableHeader', alignment: 'center' as const },
      { text: 'PRECIO', style: 'tableHeader', alignment: 'right' as const },
      { text: 'TOTAL', style: 'tableHeader', alignment: 'right' as const }
    ]);

    // Item rows
    for (const item of items) {
      tableBody.push([
        { text: item.reference || '-', style: 'tableCell' },
        { 
          stack: [
            { text: item.concept, style: 'tableCell' },
            ...(item.description ? [{ text: item.description, style: 'tableCellSmall' }] : [])
          ]
        },
        { text: this.quantityFormatter.format(item.quantity), style: 'tableCell', alignment: 'center' as const },
        { text: item.unit || 'ud', style: 'tableCell', alignment: 'center' as const },
        { text: this.currencyFormatter.format(item.unitPrice), style: 'tableCell', alignment: 'right' as const },
        { text: this.currencyFormatter.format(item.totalPrice), style: 'tableCellBold', alignment: 'right' as const }
      ]);
    }

    // Total row
    const totalAmount = order.totalAmount || items.reduce((sum, i) => sum + i.totalPrice, 0);
    tableBody.push([
      { text: '', colSpan: 4, border: [false, true, false, false] },
      {},
      {},
      {},
      { text: 'TOTAL:', style: 'totalLabel', alignment: 'right' as const, border: [false, true, false, false] },
      { text: this.currencyFormatter.format(totalAmount), style: 'totalValue', alignment: 'right' as const, border: [false, true, false, false] }
    ]);

    const table: ContentTable = {
      table: {
        headerRows: 1,
        widths: [60, '*', 45, 45, 65, 70],
        body: tableBody
      },
      layout: {
        hLineWidth: (i: number, node: { table: { body: TableCell[][] } }) => {
          if (i === 0) return 0;
          if (i === 1) return 1;
          if (i === node.table.body.length - 1) return 1;
          return 0.5;
        },
        vLineWidth: () => 0,
        hLineColor: (i: number, node: { table: { body: TableCell[][] } }) => {
          if (i === 1 || i === node.table.body.length - 1) return this.borderColor;
          return '#f1f5f9';
        },
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 8,
        paddingBottom: () => 8,
        fillColor: (rowIndex: number) => rowIndex === 0 ? this.headerBgColor : null
      }
    };

    return {
      stack: [
        { 
          text: `PRODUCTOS (${items.length})`, 
          fontSize: 11, 
          bold: true, 
          color: '#1e293b',
          marginBottom: 10
        },
        table
      ]
    };
  }

  private buildNotesSection(notes: string): Content {
    return {
      stack: [
        { text: 'NOTAS', style: 'boxTitle' },
        { 
          text: notes, 
          fontSize: 9, 
          color: '#475569',
          lineHeight: 1.4,
          margin: [0, 5, 0, 0]
        }
      ],
      style: 'infoBox'
    };
  }

  private buildFooter(payload: SupplierOrderPdfPayload): DynamicContent {
    const { companyName = 'ENTRECUINES', companyEmail, companyPhone } = payload;
    const contactInfo = [companyEmail, companyPhone].filter(Boolean).join(' · ');

    return (currentPage: number, pageCount: number): Content => ({
      columns: [
        {
          width: '*',
          text: contactInfo || companyName,
          fontSize: 8,
          color: '#94a3b8',
          alignment: 'left' as const
        },
        {
          width: 'auto',
          text: `Página ${currentPage} de ${pageCount}`,
          fontSize: 8,
          color: '#94a3b8',
          alignment: 'right' as const
        }
      ],
      margin: [40, 20, 40, 0]
    });
  }

  private getStyles(): Record<string, object> {
    return {
      infoBox: {
        fillColor: this.headerBgColor,
        margin: [10, 10, 10, 10]
      },
      boxTitle: {
        fontSize: 8,
        bold: true,
        color: '#64748b',
        letterSpacing: 0.5,
        marginBottom: 6
      },
      boxValue: {
        fontSize: 11,
        bold: true,
        color: '#1e293b',
        marginBottom: 2
      },
      boxDetail: {
        fontSize: 9,
        color: '#475569',
        marginTop: 1
      },
      tableHeader: {
        fontSize: 8,
        bold: true,
        color: '#64748b',
        letterSpacing: 0.3
      },
      tableCell: {
        fontSize: 9,
        color: '#334155'
      },
      tableCellSmall: {
        fontSize: 8,
        color: '#64748b',
        marginTop: 2
      },
      tableCellBold: {
        fontSize: 9,
        bold: true,
        color: '#1e293b'
      },
      totalLabel: {
        fontSize: 10,
        bold: true,
        color: '#475569'
      },
      totalValue: {
        fontSize: 12,
        bold: true,
        color: this.accentColor
      }
    };
  }

  private formatDate(date: string | null | undefined): string {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return date;
    }
  }
}
