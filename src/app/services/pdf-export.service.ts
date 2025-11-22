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

interface SectionHeroOptions {
  title: string;
  subtitle?: string;
  total?: { label: string; value: string };
  stats?: Array<{ label: string; value: string }>;
  background?: string;
}

@Injectable({ providedIn: 'root' })
export class PdfExportService {
  private readonly accentColor = '#7a4d32';
  private readonly currencyFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  });
  private readonly quantityFormatter = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
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


    // Secciones con salto de página entre ellas
    const content: Content[] = this.compactContent([
      ...this.buildTextBlocksSection(blocks),
      { text: '', pageBreak: 'after' },
      ...this.buildMaterialsSection(payload.materialTables, payload.materials),
      { text: '', pageBreak: 'after' },
      this.buildCountertopSection(countertop),
      { text: '', pageBreak: 'after' },
      this.buildSummarySection(payload.summary, blocks, payload.materialTables),
      { text: '', pageBreak: 'after' },
      this.buildConditionsSection(payload.conditionsTitle, payload.conditions)
    ]);

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
        },
        sectionHeroTitle: {
          fontSize: 14,
          bold: true,
          color: '#1f2933',
          characterSpacing: 0.5
        },
        sectionHeroSubtitle: {
          fontSize: 10,
          color: '#6b7280'
        },
        sectionHeroHighlight: {
          fontSize: 18,
          bold: true,
          color: this.accentColor
        },
        sectionMeta: {
          fontSize: 9,
          color: '#6b7280',
          bold: true,
          characterSpacing: 0.5
        },
        sectionCardTitle: {
          fontSize: 12,
          bold: true,
          color: '#1f2933'
        },
        sectionCardSubtitle: {
          fontSize: 9,
          color: '#6b7280',
          characterSpacing: 0.3
        },
        sectionCardTotal: {
          fontSize: 11,
          bold: true,
          color: this.accentColor
        },
        sectionGrandTotal: {
          fontSize: 14,
          bold: true,
          color: this.accentColor
        },
        pillLabel: {
          fontSize: 8,
          bold: true,
          color: '#9ca3af',
          characterSpacing: 1
        },
        pillValue: {
          fontSize: 12,
          bold: true,
          color: '#1f2933'
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
                { text: this.getCustomerDocument(customer) }
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
                { text: this.buildAddressLine(customer) }
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

  private buildAddressLine(customer: Customer | null): string {
    if (!customer) {
      return '';
    }

    const parts = [customer.address, customer.postalCode]
      .filter(Boolean)
      .map(value => value!.toString().toUpperCase());

    return parts.join(' - ');
  }

  private buildFooter(payload: BudgetPdfPayload, currentPage: number, pageCount: number): Content {
    const generatedAt = this.formatDate(payload.generatedAt);

    return {
  margin: [40, 0, 40, 30] as [number, number, number, number],
      columns: [
        {
          text: 'Entrecuines Dos S.L. · CIF B97214878 · Valencia',
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

  private getCustomerDocument(customer: Customer | null): string {
    if (!customer) {
      return '';
    }

  return customer.dni || '';
  }

  /* private buildCustomerSection(customer: Customer | null): Content | null {
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
  null
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
  } */

  private buildTextBlocksSection(blocks: BudgetTextBlock[]): Content[] {
    if (!blocks?.length) {
      return [];
    }

    const totalMobiliario = blocks.reduce((sum, block) => sum + (block.subtotal || 0), 0);
    const header = this.buildSectionHero({
      title: 'Mobiliario',
      background: '#cbb39a'
    });

    return [
      header,
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
          text: `Subtotal del mobiliario ${this.formatCurrency(block.subtotal)}`,
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
      }),
      {
        text: `TOTAL MOBILIARIO: ${this.formatCurrency(totalMobiliario)}`,
        alignment: 'right',
        bold: true,
        fontSize: 11,
        color: this.accentColor,
        margin: [0, 10, 0, 20] as [number, number, number, number],
        decoration: 'underline'
      }
    ];
  }

  private buildSectionHero(options: SectionHeroOptions): Content {
    const background = options.background ?? '#cbb39a';

    const columns: Content[] = [
      {
        width: '*',
        stack: this.compactContent([
          { text: options.title.toUpperCase(), style: 'sectionHeroTitle' },
          options.subtitle ? { text: options.subtitle, style: 'sectionHeroSubtitle', margin: [0, 4, 0, 0] as [number, number, number, number] } : null
        ])
      } as Content
    ];

    if (options.total) {
      columns.push({
        width: 'auto',
        stack: [
          { text: options.total.label, style: 'sectionMeta', alignment: 'right' },
          { text: options.total.value, style: 'sectionHeroHighlight', alignment: 'right', margin: [0, 4, 0, 0] as [number, number, number, number] }
        ]
      } as Content);
    }

    const heroStack: Content[] = [
      {
        columns,
        columnGap: 24
      }
    ];

    if (options.stats?.length) {
      heroStack.push({
        columns: options.stats.map(stat => ({ width: 'auto', stack: [this.buildStatPill(stat.label, stat.value)] } as Content)),
        columnGap: 8,
        margin: [0, 12, 0, 0] as [number, number, number, number]
      });
    }

    return this.buildCard(heroStack, background);
  }

  private buildStatPill(label: string, value: string): Content {
    return {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: label.toUpperCase(), style: 'pillLabel' },
            { text: value, style: 'pillValue', margin: [0, 2, 0, 0] as [number, number, number, number] }
          ]
        }]]
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => '#efdcc9',
        vLineColor: () => '#efdcc9',
        paddingLeft: () => 10,
        paddingRight: () => 10,
        paddingTop: () => 6,
        paddingBottom: () => 6,
        fillColor: () => '#ffffff'
      }
    };
  }

  private buildMaterialsSection(tables: MaterialTable[], standaloneMaterials: Material[]): Content[] {
    const groupedTables = tables ?? [];
    const filteredStandalone = standaloneMaterials?.filter(material => !groupedTables.some(table => table.rows?.some(row => row.id === material.id))) ?? [];

    const allRows = [
      ...groupedTables.flatMap(table => table.rows ?? []),
      ...filteredStandalone
    ];

    if (!allRows.length) {
      return [];
    }

    const overallTotal = allRows.reduce((sum, row) => sum + (row.totalPrice ?? 0), 0);
    const content: Content[] = [];

    content.push(
      this.buildSectionHero({
      title: 'Materiales y equipamiento',
      background: '#cbb39a'
      })
    );

    for (const table of groupedTables) {
      const rows = table.rows ?? [];
      content.push(this.buildMaterialGroupCard(table.title, rows));
    }

    if (filteredStandalone.length) {
      content.push(this.buildMaterialGroupCard('Materiales adicionales', filteredStandalone));
    }

    content.push(this.buildCard([
      { text: 'TOTAL MATERIALES', style: 'sectionCardTitle' },
      { text: this.formatCurrency(overallTotal), style: 'sectionGrandTotal', alignment: 'right', margin: [0, 4, 0, 0] as [number, number, number, number] }
    ], '#f4ede5'));

    return content;
  }

  private buildMaterialsTable(materials: Material[]): Content {
    const headers: TableCell[] = [
      { text: 'Referencia', style: 'tableHeader' },
      { text: 'Descripción', style: 'tableHeader' },
      { text: 'Fabricante', style: 'tableHeader' },
      { text: 'Cantidad', style: 'tableHeader', alignment: 'center' },
      { text: 'Precio unitario', style: 'tableHeader', alignment: 'right' },
      { text: 'Total', style: 'tableHeader', alignment: 'right' }
    ];

    const rows = materials.map(material => ([
      { text: material.reference || '—', color: '#4b5563', fontSize: 9 } as TableCell,
      { text: material.description || '—', fontSize: 10 } as TableCell,
      { text: material.manufacturer || '—', color: '#6b7280', fontSize: 9 } as TableCell,
      { text: this.formatQuantity(material.quantity), alignment: 'center' } as TableCell,
      { text: this.formatCurrency(material.unitPrice), alignment: 'right' } as TableCell,
      { text: this.formatCurrency(material.totalPrice), alignment: 'right', bold: true } as TableCell
    ]));

    const body: TableCell[][] = [headers, ...rows];

    return {
      table: {
        widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
        body
      },
      layout: this.materialsTableLayout()
    };
  }

  private buildMaterialGroupCard(title: string, rows: Material[]): Content {
    const countLabel = rows.length === 1 ? '1 partida' : `${rows.length} partidas`;

    const header: Content = {
      columns: [
        {
          width: '*',
          stack: [
            { text: title.toUpperCase(), style: 'materialsCardTitle' },
          ]
        }
      ],
      columnGap: 12,
      margin: [0, 0, 0, 8] as [number, number, number, number]
    };

    const tableContent = rows.length
      ? this.buildMaterialsTable(rows)
      : {
          text: 'No hay materiales en este bloque.',
          style: 'muted',
          italics: true
        };

    return this.buildCard([header, tableContent]);
  }

  private buildCard(inner: Content[], background = '#ffffff'): Content {
    return {
      table: {
        widths: ['*'],
        body: [[{ stack: inner }]]
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingLeft: () => 16,
        paddingRight: () => 16,
        paddingTop: () => 12,
        paddingBottom: () => 12,
        fillColor: () => background
      },
      margin: [0, 0, 0, 12] as [number, number, number, number]
    };
  }

  private materialsTableLayout(): TableLayout {
    const borderColor = '#e5d5c2';

    return {
      fillColor: (rowIndex: number) => {
        if (rowIndex === 0) {
          return '#efe6dc';
        }
        return rowIndex % 2 === 0 ? '#fcfaf6' : null;
      },
      hLineWidth: (rowIndex: number, node: any) => {
        if (rowIndex === 0 || rowIndex === node.table.body.length) {
          return 0;
        }
        return 0.5;
      },
      vLineWidth: () => 0,
      hLineColor: () => borderColor,
      vLineColor: () => borderColor,
      paddingLeft: (index: number) => (index === 0 ? 12 : 8),
      paddingRight: () => 8,
      paddingTop: (rowIndex: number) => (rowIndex === 0 ? 8 : 6),
      paddingBottom: (rowIndex: number) => (rowIndex === 0 ? 8 : 6)
    };
  }

  private summaryLineItemsLayout(): TableLayout {
    const borderColor = '#e5d5c2';

    return {
      fillColor: () => null, // No background for breakdown lines
      hLineWidth: (rowIndex: number) => (rowIndex === 0 ? 0 : 0.5),
      vLineWidth: () => 0,
      hLineColor: () => borderColor,
      paddingLeft: (index: number) => (index === 0 ? 12 : 8),
      paddingRight: () => 8,
      paddingTop: () => 4,
      paddingBottom: () => 4
    };
  }

  private summaryTotalsLayout(): TableLayout {
    // Only apply background color to each total row, not to breakdown lines
    const backgrounds = ['#fff7ed', '#fffbeb', '#fff4e6'];
    return {
      fillColor: (rowIndex: number) => backgrounds[rowIndex] ?? null,
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: (index: number) => (index === 0 ? 16 : 8),
      paddingRight: () => 8,
      paddingTop: () => 12,
      paddingBottom: () => 12
    };
  }

  private summaryCategoryRow(label: string, value: number, isChild = false): TableCell[] {
    const safeLabel = label?.trim() ? label : 'Concepto';
    const color = isChild ? '#4b5563' : '#1f2933';
    const leftMargin: [number, number, number, number] = isChild ? [12, 4, 0, 4] : [0, 6, 0, 6];
    const rightMargin: [number, number, number, number] = isChild ? [0, 4, 0, 4] : [0, 6, 0, 6];

    return [
      {
        text: isChild ? `${safeLabel}` : safeLabel,
        margin: leftMargin,
        color,
        fontSize: isChild ? 9 : 10,
        bold: !isChild
      },
      {
        text: this.formatCurrency(value),
        alignment: 'right',
        margin: rightMargin,
        color,
        bold: !isChild
      }
    ];
  }

  private summaryTotalsRow(label: string, value: number, emphasize = false): TableCell[] {
    const color = emphasize ? this.accentColor : '#1f2933';
    const fontSize = emphasize ? 13 : 11;

    return [
      {
        text: label,
        bold: true,
        fontSize,
        color,
        margin: [0, 6, 0, 6] as [number, number, number, number]
      },
      {
        text: this.formatCurrency(value),
        alignment: 'right',
        bold: true,
        fontSize,
        color,
        margin: [0, 6, 0, 6] as [number, number, number, number],
        decoration: emphasize ? 'underline' : undefined
      }
    ];
  }

  private calculateMaterialTableTotal(table: MaterialTable): number {
    return table.rows.reduce((sum, material) => {
      const total = material.totalPrice ?? (material.quantity ?? 0) * (material.unitPrice ?? 0);
      return sum + total;
    }, 0);
  }

  private buildCountertopSection(countertop: Countertop | null): Content | null {
    if (!countertop) return null;
    const header = this.buildSectionHero({
      title: 'Encimera',
      background: '#cbb39a'
    });

    const stack: Content[] = [];

    // Model
    if (countertop.model) {
      stack.push({
        text: [
          { text: countertop.model.toUpperCase(), bold: true }
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
      stack: [header, ...stack],
      margin: [0, 0, 0, 20] as [number, number, number, number],
      unbreakable: true
    };
  }

  private buildSummarySection(
    summary: BudgetSummary | null,
    blocks: BudgetTextBlock[],
    materialTables: MaterialTable[]
  ): Content | null {
    if (!summary) {
      return null;
    }

    const blockBreakdown = blocks
      .map(block => ({
        label: block.heading?.trim() || 'Bloque sin título',
        value: block.subtotal ?? 0
      }))
      .filter(line => Number.isFinite(line.value));

    const materialBreakdown = materialTables
      .map(table => ({
        label: table.title?.trim() || 'Tabla sin título',
        value: this.calculateMaterialTableTotal(table)
      }))
      .filter(line => Number.isFinite(line.value));

    const breakdownRows: TableCell[][] = [];
    const pushCategory = (
      label: string,
      value: number,
      breakdown?: Array<{ label: string; value: number }>
    ): void => {
      breakdownRows.push(this.summaryCategoryRow(label, value));
      breakdown?.forEach(line => {
        breakdownRows.push(this.summaryCategoryRow(line.label, line.value, true));
      });
    };

    if (summary.totalBlocks > 0) {
      pushCategory('Total mobiliario', summary.totalBlocks, blockBreakdown);
    }

    if (summary.totalMaterials > 0) {
      pushCategory('Total materiales', summary.totalMaterials, materialBreakdown);
    }

    if (summary.totalCountertop && summary.totalCountertop > 0) {
      pushCategory('Total encimera', summary.totalCountertop);
    }

    if (summary.additionalLines?.length) {
      summary.additionalLines.forEach(line => {
        pushCategory(line.concept || 'Concepto adicional', line.amount);
      });
    }

    const totalsRows: TableCell[][] = [
      this.summaryTotalsRow('SUBTOTAL', summary.subtotal),
      this.summaryTotalsRow(`IVA (${summary.vatPercentage}%)`, summary.vat),
      this.summaryTotalsRow('TOTAL GENERAL', summary.grandTotal, true)
    ];

    const header = this.buildSectionHero({
      title: 'Resumen precios',
      background: '#cbb39a'
    });

    const cardContent = this.compactContent([
      breakdownRows.length
        ? {
            table: {
              widths: ['*', 'auto'],
              body: breakdownRows
            },
            layout: this.summaryLineItemsLayout()
          }
        : null,
      {
        table: {
          widths: ['*', 'auto'],
          body: totalsRows
        },
        layout: this.summaryTotalsLayout(),
        margin: [0, breakdownRows.length ? 12 : 0, 0, 0] as [number, number, number, number]
      }
    ]);

    return {
      stack: [
        header,
        this.buildCard(cardContent)
      ]
    };
  }

  private buildConditionsSection(title = 'Condiciones generales', conditions?: Condition[] | null): Content | null {
    if (!conditions?.length) {
      return null;
    }

    const header = this.buildSectionHero({
      title,
      background: '#cbb39a'
    });

    return {
      stack: [
        header,
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

  private formatQuantity(value?: number | null): string {
    if (value === null || value === undefined) {
      return '—';
    }
    return this.quantityFormatter.format(value);
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
