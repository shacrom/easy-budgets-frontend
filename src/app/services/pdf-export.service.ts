import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import type { Content, TableCell, TDocumentDefinitions, TableLayout } from 'pdfmake/interfaces';
import { Customer } from '../models/customer.model';
import { BudgetTextBlock } from '../models/budget-text-block.model';
import { Material, MaterialTable } from '../models/material.model';
import { BudgetSummary } from '../models/budget-summary.model';
import { Condition } from '../models/conditions.model';
import { Countertop } from '../models/countertop.model';

export interface BudgetPdfMetadata {
  id: string;
  budgetNumber?: string | null;
  title?: string | null;
  status?: string | null;
  validUntil?: string | null;
  createdAt?: string | null;
}

export interface BudgetPdfPayload {
  metadata: BudgetPdfMetadata | null;
  customer: Customer | null;
  blocks: BudgetTextBlock[];
  materials: Material[];
  materialTables: MaterialTable[];
  countertop: Countertop | null;
  summary: BudgetSummary | null;
  conditionsTitle?: string;
  conditions?: Condition[];
  generatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class PdfExportService {
  private readonly accentColor = '#7a4d32';
  private readonly currencyFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  });
  private fontsRegistered = false;

  async generateBudgetPdf(payload: BudgetPdfPayload): Promise<void> {
    if (typeof window === 'undefined') {
      console.warn('La generación de PDF solo está disponible en el navegador.');
      return;
    }

    this.ensureFontsRegistered();

    const definition = await this.buildDocumentDefinition(payload);
    const fileName = this.buildFileName(payload);

    await new Promise<void>((resolve, reject) => {
      try {
        pdfMake.createPdf(definition).download(fileName, () => resolve());
      } catch (error) {
        reject(error);
      }
    });
  }

  async openBudgetPdf(payload: BudgetPdfPayload): Promise<void> {
    if (typeof window === 'undefined') {
      console.warn('La generación de PDF solo está disponible en el navegador.');
      return;
    }

    this.ensureFontsRegistered();

    const definition = await this.buildDocumentDefinition(payload);

    try {
      pdfMake.createPdf(definition).open();
    } catch (error) {
      console.error('Error opening PDF:', error);
    }
  }

  async getBudgetPdfBlobUrl(payload: BudgetPdfPayload): Promise<string> {
    if (typeof window === 'undefined') {
      return '';
    }

    this.ensureFontsRegistered();
    const definition = await this.buildDocumentDefinition(payload);

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

  private ensureFontsRegistered(): void {
    if (this.fontsRegistered) {
      return;
    }

    const fonts = pdfFonts as unknown as { pdfMake?: { vfs?: unknown } };
    const vfs = fonts?.pdfMake?.vfs;

    if (!vfs) {
      console.warn('No se pudieron cargar las fuentes embebidas de pdfMake.');
      return;
    }

    (pdfMake as unknown as { vfs: unknown }).vfs = vfs;
    this.fontsRegistered = true;
  }

  private async buildDocumentDefinition(payload: BudgetPdfPayload): Promise<TDocumentDefinitions> {
    // Pre-process countertop image if present
    let countertop = payload.countertop;
    if (countertop?.imageUrl) {
      const base64Image = await this.convertImageToBase64(countertop.imageUrl);
      if (base64Image) {
        countertop = { ...countertop, imageUrl: base64Image };
      }
    }

    // Pre-process blocks images
    const blocks = await Promise.all(payload.blocks.map(async block => {
      if (block.imageUrl) {
        const base64Image = await this.convertImageToBase64(block.imageUrl);
        if (base64Image) {
          return { ...block, imageUrl: base64Image };
        }
      }
      return block;
    }));

    const content: Content[] = [
      ...this.compactContent([
        ...this.buildTextBlocksSection(blocks),
        ...this.buildMaterialsSection(payload.materialTables, payload.materials),
        this.buildCountertopSection(countertop),
        this.buildSummarySection(payload.summary),
        this.buildConditionsSection(payload.conditionsTitle, payload.conditions)
      ])
    ];

    return {
      pageSize: 'A4',
      pageMargins: [40, 130, 40, 80],
      header: (currentPage, pageCount) => this.buildHeader(payload, currentPage, pageCount),
      footer: (currentPage, pageCount) => this.buildFooter(payload, currentPage, pageCount),
      content,
      defaultStyle: {
        fontSize: 10,
        color: '#1f2933'
      },
      styles: {
        title: {
          fontSize: 20,
          bold: true,
          color: this.accentColor,
          decoration: 'underline'
        },
        sectionHeader: {
          fontSize: 12,
          bold: true,
          color: this.accentColor,
          margin: [0, 12, 0, 8] as [number, number, number, number],
          decoration: 'underline'
        },
        blockHeading: {
          fontSize: 11,
          bold: true,
          color: this.accentColor,
          decoration: 'underline'
        },
        box: {
          margin: [0, 0, 0, 12] as [number, number, number, number]
        },
        muted: {
          color: '#6b7280'
        },
        tableHeader: {
          bold: true,
          color: this.accentColor
        }
      }
    };
  }

  private buildHeader(payload: BudgetPdfPayload, currentPage: number, pageCount: number): Content {
    const budgetNumber = payload.metadata?.budgetNumber ?? payload.metadata?.id ?? '---';
    const title = (payload.metadata?.title ?? 'PRESUPUESTO').toUpperCase();
    const dateStr = this.formatDateLong(payload.generatedAt);
    const customer = payload.customer;

    return {
      margin: [40, 20, 40, 0] as [number, number, number, number],
      stack: [
        // Row 1
        {
          columns: [
            { text: `${title} Nº ${budgetNumber}`, bold: true, alignment: 'left', fontSize: 10 },
            { text: `Valencia a ${dateStr}`, alignment: 'center', fontSize: 10 },
            { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', fontSize: 10 }
          ],
          margin: [0, 0, 0, 5] as [number, number, number, number]
        },
        // Solid Line
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }],
          margin: [0, 0, 0, 5] as [number, number, number, number]
        },
        // Row 2: Name | DNI
        {
          columns: [
            {
              width: '*',
              text: [
                { text: 'Nombre.  ', bold: false },
                { text: (customer?.name ?? '').toUpperCase() }
              ]
            },
            {
              width: 'auto',
              text: [
                { text: 'D.N.I.:  ', bold: false },
                { text: customer?.taxId ?? '' }
              ]
            }
          ],
          margin: [0, 0, 0, 2] as [number, number, number, number]
        },
        // Dotted Line
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, dash: { length: 2, space: 2 } }],
          margin: [0, 2, 0, 2] as [number, number, number, number]
        },
        // Row 3: Address | City
        {
          columns: [
            {
              width: '*',
              text: [
                { text: 'Dirección.  ', bold: false },
                { text: customer?.address ?? '' }
              ]
            },
            {
              width: 'auto',
              text: (customer?.city ?? '').toUpperCase()
            }
          ],
          margin: [0, 0, 0, 2] as [number, number, number, number]
        },
        // Dotted Line
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, dash: { length: 2, space: 2 } }],
          margin: [0, 2, 0, 2] as [number, number, number, number]
        },
        // Row 4: Phone | Email
        {
          columns: [
            {
              width: '*',
              text: [
                { text: 'Tl. Contacto  ', bold: false },
                { text: customer?.phone ?? '' }
              ]
            },
            {
              width: 'auto',
              text: [
                { text: 'E-mail:  ', bold: false },
                { text: customer?.email ?? '' }
              ]
            }
          ],
          margin: [0, 0, 0, 2] as [number, number, number, number]
        },
        // Solid Line
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }],
          margin: [0, 2, 0, 0] as [number, number, number, number]
        }
      ],
      style: {
        fontSize: 10,
        color: '#1f2933'
      }
    };
  }

  private buildFooter(payload: BudgetPdfPayload, currentPage: number, pageCount: number): Content {
    const generatedAt = this.formatDate(payload.generatedAt);

    return {
  margin: [40, 0, 40, 30] as [number, number, number, number],
      columns: [
        {
          text: 'Entrecuines Dos S.L. · CIF B12345678 · Barcelona',
          style: 'muted'
        },
        {
          text: `Generado el ${generatedAt}`,
          alignment: 'right',
          style: 'muted'
        }
      ]
    };
  }

  private buildCustomerSection(customer: Customer | null): Content | null {
    if (!customer) {
      return null;
    }

    const details = [
      `Nombre: ${customer.name}`,
      customer.email ? `Email: ${customer.email}` : null,
      customer.phone ? `Teléfono: ${customer.phone}` : null,
      customer.address ? `Dirección: ${customer.address}` : null,
      customer.city ? `Ciudad: ${customer.city}` : null,
      customer.postalCode ? `Código Postal: ${customer.postalCode}` : null,
      customer.taxId ? `CIF/NIF: ${customer.taxId}` : null
    ].filter(Boolean) as string[];

    return {
      style: 'box',
      stack: [
  { text: 'Datos del cliente', style: 'sectionHeader', margin: [0, 0, 0, 6] as [number, number, number, number] },
        {
          ul: details,
          margin: [0, 0, 0, 4] as [number, number, number, number]
        }
      ]
    };
  }

  private buildTextBlocksSection(blocks: BudgetTextBlock[]): Content[] {
    if (!blocks?.length) {
      return [];
    }

    return [
      { text: 'MOBILIARIO', style: 'sectionHeader' },
      ...blocks.map(block => {
        const stack: Content[] = [];

        stack.push({
          text: block.heading,
          style: 'blockHeading',
          margin: [0, 0, 0, 8] as [number, number, number, number]
        });

        for (const section of block.descriptions ?? []) {
          if (section.title) {
            stack.push({
              text: section.title,
              bold: true,
              margin: [0, 4, 0, 2] as [number, number, number, number]
            });
          }

          stack.push({
            text: section.text,
            margin: [0, 0, 0, 4] as [number, number, number, number]
          });
        }

        if (block.imageUrl) {
          stack.push({
            image: block.imageUrl,
            width: 200,
            alignment: 'center',
            margin: [0, 10, 0, 10] as [number, number, number, number]
          });
        }

        if (block.link) {
          stack.push({
            text: block.link,
            link: block.link,
            color: '#2563eb',
            margin: [0, 6, 0, 0] as [number, number, number, number]
          });
        }

        stack.push({
          text: `Subtotal del bloque: ${this.formatCurrency(block.subtotal)}`,
          alignment: 'right',
          bold: true,
          color: this.accentColor,
          margin: [0, 8, 0, 0] as [number, number, number, number]
        });

        return {
          style: 'box',
          margin: [0, 0, 0, 8] as [number, number, number, number],
          stack
        };
      })
    ];
  }

  private buildMaterialsSection(tables: MaterialTable[], standaloneMaterials: Material[]): Content[] {
    const content: Content[] = [];

    if (tables?.length) {
      for (const table of tables) {
        const rows = table.rows ?? [];
        const total = rows.reduce((sum, row) => sum + (row.totalPrice ?? 0), 0);

        content.push({
          style: 'box',
          stack: [
            { text: table.title, style: 'blockHeading', margin: [0, 0, 0, 8] as [number, number, number, number] },
            this.buildMaterialsTable(rows),
            {
              text: `Total del grupo: ${this.formatCurrency(total)}`,
              alignment: 'right',
              bold: true,
              color: this.accentColor,
              margin: [0, 6, 0, 0] as [number, number, number, number]
            }
          ]
        });
      }
    }

    const filteredStandalone = standaloneMaterials?.filter(material => !tables?.some(table => table.rows?.some(row => row.id === material.id)));
    if (filteredStandalone?.length) {
      content.push({
        style: 'box',
        stack: [
          { text: 'Materiales adicionales', style: 'blockHeading', margin: [0, 0, 0, 8] as [number, number, number, number] },
          this.buildMaterialsTable(filteredStandalone)
        ]
      });
    }

    return content;
  }

  private buildMaterialsTable(materials: Material[]): Content {
    const body: TableCell[][] = [
      [
        { text: 'Referencia', style: 'tableHeader' },
        { text: 'Descripción', style: 'tableHeader' },
        { text: 'Fabricante', style: 'tableHeader' },
        { text: 'Cantidad', style: 'tableHeader' },
        { text: 'Precio unitario', style: 'tableHeader' },
        { text: 'Total', style: 'tableHeader' }
      ],
      ...materials.map(material => [
        material.reference,
        material.description,
        material.manufacturer,
        material.quantity?.toString() ?? '—',
        this.formatCurrency(material.unitPrice),
        this.formatCurrency(material.totalPrice)
      ])
    ];

    return {
      table: {
        widths: ['auto', '*', '*', 'auto', 'auto', 'auto'],
        body
      },
      layout: 'lightHorizontalLines'
    };
  }

  private buildCountertopSection(countertop: Countertop | null): Content | null {
    if (!countertop) return null;

    const stack: Content[] = [
      { text: 'ENCIMERA', style: 'sectionHeader' }
    ];

    // Model
    if (countertop.model) {
      stack.push({
        text: [
          { text: 'MODELO ENCIMERA: ', bold: true },
          { text: countertop.model.toUpperCase() }
        ],
        margin: [0, 0, 0, 8] as [number, number, number, number],
        style: 'box'
      });
    }

    // Description
    if (countertop.description) {
      stack.push({
        text: countertop.description.toUpperCase(),
        margin: [0, 0, 0, 8] as [number, number, number, number],
        style: 'box'
      });
    }

    // Image
    if (countertop.imageUrl) {
      stack.push({
        image: countertop.imageUrl,
        width: 200,
        alignment: 'center',
        margin: [0, 10, 0, 10] as [number, number, number, number]
      });
    }

    // Price
    if (countertop.price) {
      stack.push({
        text: [
          { text: 'TOTAL PRECIO: ', bold: true },
          { text: this.formatCurrency(countertop.price) }
        ],
        alignment: 'right',
        margin: [0, 10, 0, 0] as [number, number, number, number]
      });
    }

    return {
      stack,
      margin: [0, 0, 0, 20] as [number, number, number, number],
      unbreakable: true
    };
  }

  private buildSummarySection(summary: BudgetSummary | null): Content | null {
    if (!summary) {
      return null;
    }

    const rows: TableCell[][] = [];

    if (summary.totalBlocks > 0) {
      rows.push(['Total bloques', this.formatCurrency(summary.totalBlocks)]);
    }

    if (summary.totalMaterials > 0) {
      rows.push(['Total materiales', this.formatCurrency(summary.totalMaterials)]);
    }

    if (summary.totalCountertop && summary.totalCountertop > 0) {
      rows.push(['Total encimera', this.formatCurrency(summary.totalCountertop)]);
    }

    rows.push(['Subtotal', this.formatCurrency(summary.subtotal)]);
    rows.push([`IVA (${summary.vatPercentage}%)`, this.formatCurrency(summary.vat)]);
    rows.push(['Total general', this.formatCurrency(summary.grandTotal)]);

    if (summary.additionalLines?.length) {
      for (const line of summary.additionalLines) {
        rows.splice(rows.length - 1, 0, [line.concept, this.formatCurrency(line.amount)]);
      }
    }

    return {
      style: 'box',
      stack: [
  { text: 'Resumen económico', style: 'sectionHeader', margin: [0, 0, 0, 8] as [number, number, number, number] },
        {
          table: {
            widths: ['*', 'auto'],
            body: rows
          },
          layout: this.stripedLayout()
        }
      ]
    };
  }

  private buildConditionsSection(title = 'Condiciones generales', conditions?: Condition[] | null): Content | null {
    if (!conditions?.length) {
      return null;
    }

    return {
      stack: [
  { text: title, style: 'sectionHeader', margin: [0, 12, 0, 8] as [number, number, number, number] },
        {
          ol: conditions.map(condition => ({
            stack: this.compactContent([
              condition.title ? { text: condition.title, bold: true, margin: [0, 0, 0, 2] as [number, number, number, number], color: this.accentColor } : null,
              { text: condition.text }
            ])
          }))
        }
      ]
    };
  }

  private buildFileName(payload: BudgetPdfPayload): string {
    const slug = payload.metadata?.budgetNumber ?? payload.metadata?.id ?? 'presupuesto';
    return `${slug}.pdf`;
  }

  private formatCurrency(value?: number | null): string {
    return this.currencyFormatter.format(value ?? 0);
  }

  private formatDate(value?: string | null): string {
    if (!value) {
      return new Date().toLocaleDateString('es-ES');
    }
    return new Date(value).toLocaleDateString('es-ES');
  }

  private formatDateLong(value?: string | null): string {
    const date = value ? new Date(value) : new Date();
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  private stripedLayout(): TableLayout {
    return {
      fillColor: (rowIndex: number) => (rowIndex > 0 && rowIndex % 2 === 0 ? '#f9fafb' : null)
    };
  }

  private compactContent<T extends Content>(values: Array<T | null | undefined>): T[] {
    return values.filter((value): value is T => value !== null && value !== undefined);
  }

  private async convertImageToBase64(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Error loading image:', error);
      return null;
    }
  }
}
