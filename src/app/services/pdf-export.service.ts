import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import type { Content, TableCell, TDocumentDefinitions, TableLayout } from 'pdfmake/interfaces';
import { Customer } from '../models/customer.model';
import { BudgetTextBlock } from '../models/budget-text-block.model';
import { Material, MaterialTable } from '../models/material.model';
import { BudgetSummary, SummaryLine, SummaryLineType } from '../models/budget-summary.model';
import { Condition } from '../models/conditions.model';
import { SimpleBlock } from '../models/simple-block.model';

export interface BudgetPdfMetadata {
  id: number;
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
  simpleBlock: SimpleBlock | null;
  summary: BudgetSummary | null;
  materialsSectionTitle?: string;
  conditionsTitle?: string;
  conditions?: Condition[];
  companyLogoUrl?: string;
  supplierLogoUrl?: string;
  showSignature?: boolean;
  printTextBlocks?: boolean;
  printMaterials?: boolean;
  printSimpleBlock?: boolean;
  printConditions?: boolean;
  printSummary?: boolean;
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

  async getBudgetPdfBlobUrlWithPageCount(payload: BudgetPdfPayload): Promise<{ url: string; pageCount: number }> {
    if (typeof window === 'undefined') {
      return { url: '', pageCount: 0 };
    }

    this.ensureFontsRegistered();
    const definition = await this.buildDocumentDefinition(payload);

    return new Promise((resolve, reject) => {
      try {
        const pdfDocGenerator = pdfMake.createPdf(definition);

        // First get the page count by generating the document info
        pdfDocGenerator.getBuffer((buffer) => {
          // Parse PDF to count pages - look for /Type /Page entries
          const uint8Array = new Uint8Array(buffer);
          const pdfString = new TextDecoder('latin1').decode(uint8Array);
          const pageMatches = pdfString.match(/\/Type\s*\/Page[^s]/g);
          const pageCount = pageMatches ? pageMatches.length : 1;

          // Create blob URL
          const blob = new Blob([uint8Array], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);

          resolve({ url, pageCount });
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
    // Pre-process simpleBlock image if present
    let simpleBlock = payload.simpleBlock;
    if (simpleBlock?.imageUrl) {
      const base64Image = await this.convertImageToBase64(simpleBlock.imageUrl);
      if (base64Image) {
        simpleBlock = { ...simpleBlock, imageUrl: base64Image };
      }
    }

    // Pre-process logo images
    let companyLogoBase64: string | null = null;
    let supplierLogoBase64: string | null = null;

    if (payload.companyLogoUrl) {
      companyLogoBase64 = await this.convertImageToBase64(payload.companyLogoUrl);
    }
    if (payload.supplierLogoUrl) {
      supplierLogoBase64 = await this.convertImageToBase64(payload.supplierLogoUrl);
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


    // Construir secciones individuales
    const textBlocksContent = (payload.printTextBlocks !== false) ? this.buildTextBlocksSection(blocks) : [];
    const materialsContent = (payload.printMaterials !== false) ? this.buildMaterialsSection(payload.materialTables, payload.materials, payload.materialsSectionTitle) : [];
    const simpleBlockContent = (payload.printSimpleBlock !== false) ? this.buildSimpleBlockSection(simpleBlock) : null;

    // Obtener títulos personalizados
    const blocksSectionTitle = blocks[0]?.sectionTitle || 'Mobiliario';
    const simpleBlockSectionTitle = simpleBlock?.sectionTitle || 'Bloque Simple';

    const summaryContent = (payload.printSummary !== false) ? this.buildSummarySection(
      payload.summary,
      blocks,
      payload.materialTables,
      payload.materialsSectionTitle,
      blocksSectionTitle,
      simpleBlockSectionTitle
    ) : null;
    const conditionsContent = (payload.printConditions !== false) ? this.buildConditionsSection(payload.conditionsTitle, payload.conditions) : null;
    const signatureContent = payload.showSignature !== false ? this.buildSignatureSection(payload.customer) : null;

    // Agrupar secciones con su contenido (solo las que tienen contenido)
    const sections: Content[][] = [
      textBlocksContent.length > 0 ? textBlocksContent : [],
      materialsContent.length > 0 ? materialsContent : [],
      simpleBlockContent ? [simpleBlockContent] : [],
      summaryContent ? [summaryContent] : [],
      conditionsContent ? [conditionsContent] : [],
      signatureContent ? [signatureContent] : []
    ].filter(section => section.length > 0);

    // Construir contenido con saltos de página solo entre secciones que existen
    const content: Content[] = [];
    sections.forEach((section, index) => {
      content.push(...section);
      // Añadir salto de página después de cada sección excepto la última
      if (index < sections.length - 1) {
        content.push({ text: '', pageBreak: 'after' });
      }
    });

    return {
      pageSize: 'A4',
      pageMargins: [40, companyLogoBase64 || supplierLogoBase64 ? 185 : 110, 40, 80],
      header: (currentPage, pageCount) => this.buildHeader(payload, currentPage, pageCount, companyLogoBase64, supplierLogoBase64),
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
          fontSize: 12,
          bold: true,
          color: '#1f2933',
          characterSpacing: 0.5
        },
        blockSubtotalLabel: {
          fontSize: 9,
          color: '#6b7280',
          bold: true,
          characterSpacing: 1
        },
        blockSubtotalValue: {
          fontSize: 12,
          bold: true,
          color: this.accentColor
        },
        blockParagraph: {
          lineHeight: 1.2
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
        },
        additionalHeader: {
          fontSize: 10,
          bold: true,
          color: '#1f2933',
          margin: [0, 6, 0, 2] as [number, number, number, number]
        },
        signatureLabel: {
          fontSize: 9,
          bold: true,
          color: '#9ca3af',
          characterSpacing: 1.2
        },
        signatureHint: {
          fontSize: 10,
          color: '#4b5563',
          alignment: 'center'
        }
      }
    };
  }

  private buildHeader(
    payload: BudgetPdfPayload,
    currentPage: number,
    pageCount: number,
    companyLogoBase64?: string | null,
    supplierLogoBase64?: string | null
  ): Content {
    const title = (payload.metadata?.title ?? 'PRESUPUESTO').toUpperCase();
    const dateStr = this.formatDateLong(payload.generatedAt);
    const customer = payload.customer;

    const headerStack: Content[] = [];

    // Logo row (if any logo is present)
    if (companyLogoBase64 || supplierLogoBase64) {
      // Use a table to ensure the company logo is always centered
      headerStack.push({
        table: {
          widths: ['*', 'auto', '*'],
          body: [[
            // Left cell: empty (for balance)
            { text: '', border: [false, false, false, false] },
            // Center cell: Company logo
            companyLogoBase64
              ? { image: companyLogoBase64, width: 130, alignment: 'center', border: [false, false, false, false] }
              : { text: '', border: [false, false, false, false] },
            // Right cell: Supplier logo
            supplierLogoBase64
              ? { image: supplierLogoBase64, width: 50, alignment: 'right', border: [false, false, false, false] }
              : { text: '', border: [false, false, false, false] }
          ]]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 10] as [number, number, number, number]
      });
    }

    // Row 1: Title | Date | Page
    headerStack.push({
      columns: [
        { text: `${title}`, bold: true, alignment: 'left', fontSize: 10 },
        { text: `Valencia a ${dateStr}`, alignment: 'center', fontSize: 10 },
        { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', fontSize: 10 }
      ],
      margin: [0, 0, 0, 5] as [number, number, number, number]
    });

    // Solid Line
    headerStack.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }],
      margin: [0, 0, 0, 5] as [number, number, number, number]
    });

    // Row 2: Name | DNI
    headerStack.push({
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
    });

    // Dotted Line
    headerStack.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, dash: { length: 2, space: 2 } }],
      margin: [0, 2, 0, 2] as [number, number, number, number]
    });

    // Row 3: Address | City
    headerStack.push({
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
    });

    // Dotted Line
    headerStack.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, dash: { length: 2, space: 2 } }],
      margin: [0, 2, 0, 2] as [number, number, number, number]
    });

    // Row 4: Phone | Email
    headerStack.push({
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
    });

    // Solid Line
    headerStack.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }],
      margin: [0, 2, 0, 0] as [number, number, number, number]
    });

    return {
      margin: [40, 20, 40, 0] as [number, number, number, number],
      stack: headerStack,
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

  private buildTextBlocksSection(blocks: BudgetTextBlock[]): Content[] {
     if (!blocks?.length) {
      return [];
    }

    const totalMobiliario = blocks.reduce((sum, block) => sum + (block.subtotal || 0), 0);
    const sectionTitle = blocks[0]?.sectionTitle || 'Mobiliario';
    const header = this.buildSectionHero({
      title: sectionTitle,
      background: '#cbb39a'
    });

    return [
      header,
      ...blocks.map(block => {
        const stack: Content[] = [];

        stack.push(this.buildBlockHeading(block.heading));

        for (const section of block.descriptions ?? []) {
          if (section.title) {
            stack.push({
              text: section.title,
              bold: true,
              margin: [0, 4, 0, 2] as [number, number, number, number],
              style: 'blockParagraph'
            });
          }

          stack.push({
            text: section.text,
            margin: [0, 0, 0, 4] as [number, number, number, number],
            style: 'blockParagraph'
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
            margin: [0, 6, 0, 0] as [number, number, number, number],
            style: 'blockParagraph'
          });
        }

        stack.push(this.buildBlockSubtotal(block.subtotal));

        // Increased margin below each block for more separation
        return {
          style: 'box',
          margin: [0, 0, 0, 28] as [number, number, number, number],
          stack
        };
      }),
      this.buildCard([
        {
          columns: [
            { text: 'TOTAL MOBILIARIO', style: 'sectionCardTitle', width: '*' },
            { text: this.formatCurrency(totalMobiliario), style: 'sectionGrandTotal', alignment: 'right', width: 'auto' }
          ]
        }
      ], '#f4ede5')
    ];
  }

  private buildBlockHeading(title?: string | null): Content {
    const safeTitle = (title?.trim() || 'Bloque sin título').toUpperCase();

    return {
      table: {
        widths: ['*'],
        body: [[{ text: safeTitle, style: 'blockHeading' }]]
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: () => 1,
        paddingBottom: () => 1,
        fillColor: () => '#f6f1eb'
      },
      margin: [0, 0, 0, 8] as [number, number, number, number]
    };
  }

  private buildBlockSubtotal(value?: number | null): Content {
    return {
      table: {
        widths: ['*', 'auto'],
        body: [[
          { text: 'SUBTOTAL MOBILIARIO', style: 'blockSubtotalLabel' },
          { text: this.formatCurrency(value), style: 'blockSubtotalValue', alignment: 'right' }
        ]]
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: () => 1,
        paddingBottom: () => 1,
        fillColor: () => '#fdf8f3'
      },
      margin: [0, 8, 0, 0] as [number, number, number, number]
    };
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

  private buildMaterialsSection(tables: MaterialTable[], standaloneMaterials: Material[], sectionTitle?: string): Content[] {
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
      title: sectionTitle || 'Materiales y equipamiento',
      background: '#cbb39a'
      })
    );

    for (const table of groupedTables) {
      const rows = table.rows ?? [];
      const visibility = {
        reference: table.showReference ?? true,
        description: table.showDescription ?? true,
        manufacturer: table.showManufacturer ?? true,
        quantity: table.showQuantity ?? true,
        unitPrice: table.showUnitPrice ?? true,
        totalPrice: table.showTotalPrice ?? true
      } as const;
      content.push(this.buildMaterialGroupCard(table.title, rows, visibility));
    }

    if (filteredStandalone.length) {
      const defaultVisibility = {
        reference: true,
        description: true,
        manufacturer: true,
        quantity: true,
        unitPrice: true,
        totalPrice: true
      } as const;
      content.push(this.buildMaterialGroupCard('Materiales adicionales', filteredStandalone, defaultVisibility));
    }

    content.push(this.buildCard([
      {
        columns: [
          { text: ('Total').toUpperCase(), style: 'sectionCardTitle', width: '*' },
          { text: this.formatCurrency(overallTotal), style: 'sectionGrandTotal', alignment: 'right', width: 'auto' }
        ]
      }
    ], '#f4ede5'));

    return content;
  }

  private buildMaterialsTable(materials: Material[], visibility?: { reference: boolean; description: boolean; manufacturer: boolean; quantity: boolean; unitPrice: boolean; totalPrice: boolean }): Content {
    const v = visibility ?? { reference: true, description: true, manufacturer: true, quantity: true, unitPrice: true, totalPrice: true };
    const headers: TableCell[] = [];
    const widths: (string | number)[] = [];

    if (v.reference) {
      headers.push({ text: 'Referencia', style: 'tableHeader' });
      widths.push('auto');
    }
    if (v.description) {
      headers.push({ text: 'Descripción', style: 'tableHeader' });
      widths.push('*');
    }
    if (v.manufacturer) {
      headers.push({ text: 'Fabricante', style: 'tableHeader' });
      widths.push('auto');
    }
    if (v.quantity) {
      headers.push({ text: 'Cantidad', style: 'tableHeader', alignment: 'center' });
      widths.push('auto');
    }
    if (v.unitPrice) {
      headers.push({ text: 'Precio unitario', style: 'tableHeader', alignment: 'right' });
      widths.push('auto');
    }
    if (v.totalPrice) {
      headers.push({ text: 'Total', style: 'tableHeader', alignment: 'right' });
      widths.push('auto');
    }

    const rows = materials.map(material => {
      const r: TableCell[] = [];
      if (v.reference) r.push({ text: material.reference || '—', color: '#4b5563', fontSize: 9 } as TableCell);
      if (v.description) r.push({ text: material.description || '—', fontSize: 10 } as TableCell);
      if (v.manufacturer) r.push({ text: material.manufacturer || '—', color: '#6b7280', fontSize: 9 } as TableCell);
      if (v.quantity) r.push({ text: this.formatQuantity(material.quantity), alignment: 'center' } as TableCell);
      if (v.unitPrice) r.push({ text: this.formatCurrency(material.unitPrice), alignment: 'right' } as TableCell);
      if (v.totalPrice) r.push({ text: this.formatCurrency(material.totalPrice), alignment: 'right', bold: true } as TableCell);
      return r;
    });

    const body: TableCell[][] = [headers, ...rows];

    return {
      table: {
        widths,
        body
      },
      layout: this.materialsTableLayout()
    };
  }

  private buildMaterialGroupCard(title: string, rows: Material[], visibility?: { reference: boolean; description: boolean; manufacturer: boolean; quantity: boolean; unitPrice: boolean; totalPrice: boolean }): Content {
    const countLabel = rows.length === 1 ? '1 partida' : `${rows.length} partidas`;
    const subtotal = rows.reduce((sum, row) => sum + (row.totalPrice ?? 0), 0);

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
      ? this.buildMaterialsTable(rows, visibility)
      : {
          text: 'No hay materiales en este bloque.',
          style: 'muted',
          italics: true
        };

    const subtotalRow: Content = {
      table: {
        widths: ['*', 'auto'],
        body: [[
          { text: 'SUBTOTAL', style: 'blockSubtotalLabel' },
          { text: this.formatCurrency(subtotal), style: 'blockSubtotalValue', alignment: 'right' }
        ]]
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingLeft: () => 12,
        paddingRight: () => 12,
        paddingTop: () => 8,
        paddingBottom: () => 8,
        fillColor: () => '#fdf8f3'
      },
      margin: [0, 8, 0, 0] as [number, number, number, number]
    };

    return this.buildCard([header, tableContent, subtotalRow]);
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
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 2,
        paddingBottom: () => 2,
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
      paddingTop: () => 0,
      paddingBottom: () => 0
    };
  }

  private signatureBoxesLayout(): TableLayout {
    const borderColor = '#d7c8b8';
    return {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => borderColor,
      vLineColor: () => borderColor,
      paddingLeft: () => 18,
      paddingRight: () => 18,
      paddingTop: () => 0,
      paddingBottom: () => 0
    };
  }

  private summaryCategoryRow(label: string, value: number, isChild = false): TableCell[] {
    const safeLabel = label?.trim() ? label : 'Concepto';
    const color = isChild ? '#4b5563' : '#1f2933';
    const leftMargin: [number, number, number, number] = isChild ? [10, 2, 0, 2] : [0, 3, 0, 3];
    const rightMargin: [number, number, number, number] = isChild ? [0, 2, 0, 2] : [0, 3, 0, 3];

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
        margin: [0, 1, 0, 1] as [number, number, number, number]
      },
      {
        text: this.formatCurrency(value),
        alignment: 'right',
        bold: true,
        fontSize,
        color,
        margin: [0, 1, 0, 1] as [number, number, number, number],
        decoration: emphasize ? 'underline' : undefined
      }
    ];
  }

  private summaryDiscountRow(label: string, value: number): TableCell[] {
    return [
      {
        text: label,
        bold: true,
        fontSize: 11,
        color: '#b91c1c',
        margin: [0, 1, 0, 1] as [number, number, number, number]
      },
      {
        text: this.formatCurrency(value),
        alignment: 'right',
        bold: true,
        fontSize: 11,
        color: '#b91c1c',
        margin: [0, 1, 0, 1] as [number, number, number, number]
      }
    ];
  }

  private calculateMaterialTableTotal(table: MaterialTable): number {
    return table.rows.reduce((sum, material) => {
      const total = material.totalPrice ?? (material.quantity ?? 0) * (material.unitPrice ?? 0);
      return sum + total;
    }, 0);
  }

  private buildSimpleBlockSection(simpleBlock: SimpleBlock | null): Content | null {
    if (!simpleBlock) return null;
    // Obtener el título de la sección, o usar 'Bloque Simple' por defecto
    const sectionTitle = simpleBlock.sectionTitle || 'Bloque Simple';
    const header = this.buildSectionHero({
      title: sectionTitle,
      background: '#cbb39a'
    });

    const stack: Content[] = [];

    // Model
    if (simpleBlock.model) {
      stack.push({
        text: [
          { text: simpleBlock.model.toUpperCase(), bold: true }
        ],
        margin: [0, 0, 0, 8] as [number, number, number, number],
        style: 'box'
      });
    }

    // Description
    if (simpleBlock.description) {
      stack.push({
        text: simpleBlock.description.toUpperCase(),
        margin: [0, 0, 0, 8] as [number, number, number, number],
        style: 'box'
      });
    }

    // Image
    if (simpleBlock.imageUrl) {
      stack.push({
        image: simpleBlock.imageUrl,
        width: 200,
        alignment: 'center',
        margin: [0, 10, 0, 10] as [number, number, number, number]
      });
    }

    // Price
    if (simpleBlock.price) {
      stack.push(
        this.buildCard([
          {
            columns: [
              { text: 'TOTAL ' + sectionTitle.toUpperCase(), style: 'sectionCardTitle', width: '*' },
              { text: this.formatCurrency(simpleBlock.price), style: 'sectionGrandTotal', alignment: 'right', width: 'auto' }
            ]
          }
        ], '#f4ede5')
      );
    }

    return {
      stack: [header, ...stack],
      margin: [0, 0, 0, 20] as [number, number, number, number],
      unbreakable: true
    };
  }

  private buildSignatureSection(customer: Customer | null): Content {
    return {
      margin: [0, 40, 0, 0] as [number, number, number, number],
      stack: [
        {
          table: {
            widths: ['*', '*'],
            body: [[
              this.buildSignatureBox('Firma del cliente', customer?.name),
              this.buildSignatureBox('Firma de la empresa')
            ]]
          },
          layout: this.signatureBoxesLayout()
        }
      ]
    };
  }

  private buildSignatureBox(label: string, name?: string | null): Content {
    return {
      stack: this.compactContent([
        { text: label.toUpperCase(), style: 'signatureLabel', margin: [0, 0, 0, 24] as [number, number, number, number] },
        { text: '_______________________________', alignment: 'center', margin: [0, 30, 0, 8] as [number, number, number, number] },
        name?.trim() ? { text: name!.toUpperCase(), style: 'signatureHint' } : null
      ])
    };
  }

  private buildSummarySection(
    summary: BudgetSummary | null,
    blocks: BudgetTextBlock[],
    materialTables: MaterialTable[],
    materialsSectionTitle?: string,
    blocksSectionTitle?: string,
    simpleBlockSectionTitle?: string
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

    // Use totalSimpleBlock with fallback to totalCountertop for backward compatibility
    const simpleBlockTotal = summary.totalSimpleBlock ?? summary.totalCountertop ?? 0;

    // Calcular el subtotal base
    const baseSubtotal = (summary.totalBlocks ?? 0) + (summary.totalMaterials ?? 0) + simpleBlockTotal;

    // Filtrar líneas opcionales para el cálculo de totales
    const nonOptionalLines = (summary.additionalLines ?? []).filter(line => this.resolveSummaryLineType(line) !== 'optional');
    const optionalLines = (summary.additionalLines ?? []).filter(line => this.resolveSummaryLineType(line) === 'optional');

    // Calcular solo los recargos (sin descuentos) para la base imponible
    const adjustmentsTotal = nonOptionalLines
      .filter(line => this.resolveSummaryLineType(line) === 'adjustment')
      .reduce((sum, line) => sum + (Math.abs(Number(line?.amount ?? 0)) || 0), 0);

    // Base imponible = subtotal base + recargos (sin descuentos)
    const taxableBase = baseSubtotal + adjustmentsTotal;
    const vat = taxableBase * ((summary.vatPercentage ?? 21) / 100);
    const totalBeforeDiscount = taxableBase + vat;

    // Calcular descuentos sobre el total con IVA
    const discountLines = nonOptionalLines.filter(line => this.resolveSummaryLineType(line) === 'discount');
    const totalDiscount = discountLines.reduce((sum, line) => {
      const percentage = Math.abs(Number(line?.amount ?? 0)) || 0;
      return sum + (totalBeforeDiscount * (percentage / 100));
    }, 0);

    const grandTotal = totalBeforeDiscount - totalDiscount;

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
      pushCategory(`Total ${blocksSectionTitle || 'mobiliario'}`, summary.totalBlocks, blockBreakdown);
    }

    if (summary.totalMaterials > 0) {
      pushCategory(materialsSectionTitle || 'Materiales y equipamiento', summary.totalMaterials, materialBreakdown);
    }

    if (simpleBlockTotal > 0) {
      pushCategory(`Total ${simpleBlockSectionTitle || 'bloque simple'}`, simpleBlockTotal);
    }

    if (summary.additionalLines?.length) {
      // Add an explicit header for additional lines so they don't appear visually
      // under other categories (e.g., 'Total encimera') in the table.
      breakdownRows.push([
        { text: 'Conceptos adicionales', style: 'additionalHeader', colSpan: 2 },
        {}
      ] as TableCell[]);

      summary.additionalLines.forEach(line => {
        const type = this.resolveSummaryLineType(line);
        const label = this.formatSummaryLineLabel(line, totalBeforeDiscount);

        if (type === 'note') {
          breakdownRows.push([
            {
              text: label,
              margin: [12, 4, 0, 4] as [number, number, number, number],
              color: '#6b7280',
              italics: true,
              fontSize: 9
            },
            {
              text: '—',
              alignment: 'right',
              margin: [0, 4, 0, 4] as [number, number, number, number],
              color: '#9ca3af',
              italics: true
            }
          ]);
          return;
        }

        const row = this.summaryCategoryRow(label, this.formatSummaryLineAmount(line, totalBeforeDiscount), true) as [TableCell, TableCell];

        if (type === 'optional') {
          const labelCell = row[0] as TableCell & Record<string, unknown>;
          const valueCell = row[1] as TableCell & Record<string, unknown>;
          labelCell.decoration = 'lineThrough';
          labelCell.color = '#6b7280';
          valueCell.decoration = 'lineThrough';
          valueCell.color = '#6b7280';
        }

        if (type === 'discount') {
          const valueCell = row[1] as TableCell & Record<string, unknown>;
          valueCell.color = '#b91c1c';
        }

        breakdownRows.push(row);
      });
    }

    const totalsRows: TableCell[][] = [
      this.summaryTotalsRow('BASE IMPONIBLE', taxableBase),
      this.summaryTotalsRow(`IVA (${summary.vatPercentage}%)`, vat)
    ];

    // Añadir filas de descuento si hay descuentos aplicados
    if (totalDiscount > 0) {
      totalsRows.push(this.summaryTotalsRow('Total antes de descuento', totalBeforeDiscount));
      totalsRows.push(this.summaryDiscountRow('Descuento aplicado', -totalDiscount));
    }

    // Recopilar mensajes de validez para descuentos
    const discountValidityMessages = this.buildDiscountValidityMessages(summary.additionalLines);

    const summaryTotalsLayoutWithGrayIva: TableLayout = {
      fillColor: (rowIndex: number) => {
        if (rowIndex === 1) return '#F9F6F2';
        const backgrounds = ['#fff7ed', '#fffbeb', '#fff4e6'];
        return backgrounds[rowIndex] ?? null;
      },
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: (index: number) => (index === 0 ? 16 : 8),
      paddingRight: () => 8,
      paddingTop: () => 2,
      paddingBottom: () => 2
    };

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
        layout: summaryTotalsLayoutWithGrayIva,
        margin: [0, breakdownRows.length ? 6 : 0, 0, 0] as [number, number, number, number]
      }
    ]);


    const grandTotalCard = this.buildCard([
      {
        columns: [
          { text: 'TOTAL GENERAL', style: 'sectionCardTitle', width: '*' },
          { text: this.formatCurrency(grandTotal), style: 'sectionGrandTotal', alignment: 'right', width: 'auto' }
        ]
      }
    ], '#f4ede5');

    const summaryCard = this.buildCard(cardContent) as Content & { margin?: number[] };
    summaryCard.margin = [0, 0, 0, 6];

    const stack: Content[] = [
      header,
      summaryCard,
      grandTotalCard
    ];

    if (this.hasOptionalSummaryLines(summary.additionalLines)) {
      stack.push({
        text: '* Los precios de los productos opcionales no se contabilizan sobre el total general.',
        fontSize: 9,
        color: '#4b5563',
        margin: [0, 4, 0, 0] as [number, number, number, number]
      });
    }

    // Añadir mensajes de validez de descuentos
    if (discountValidityMessages.length > 0) {
      discountValidityMessages.forEach((message: string) => {
        stack.push({
          text: message,
          fontSize: 9,
          color: '#b91c1c',
          italics: true,
          margin: [0, 4, 0, 0] as [number, number, number, number]
        });
      });
    }

    return { stack };
  }

  private resolveSummaryLineType(line?: SummaryLine | null): SummaryLineType {
    return line?.conceptType ?? 'adjustment';
  }

  private formatSummaryLineAmount(line: SummaryLine, totalWithVat: number): number {
    const type = this.resolveSummaryLineType(line);
    const amount = Math.abs(Number(line?.amount ?? 0)) || 0;

    if (type === 'discount') {
      // Calcular el descuento como porcentaje del total con IVA
      const discountAmount = totalWithVat * (amount / 100);
      return -discountAmount;
    }

    return amount;
  }

  private formatSummaryLineLabel(line: SummaryLine, baseSubtotal?: number): string {
    const type = this.resolveSummaryLineType(line);
    const base = line.concept?.trim() || 'Concepto adicional';

    if (type === 'discount' && baseSubtotal !== undefined) {
      const percentage = Math.abs(Number(line?.amount ?? 0)) || 0;
      return `${base} (${percentage}%)`;
    }

    return type === 'optional' ? `${base} *` : base;
  }

  private hasOptionalSummaryLines(lines?: SummaryLine[] | null): boolean {
    return (lines ?? []).some(line => this.resolveSummaryLineType(line) === 'optional');
  }

  private buildDiscountValidityMessages(lines?: SummaryLine[] | null): string[] {
    if (!lines?.length) {
      return [];
    }

    return lines
      .filter(line => this.resolveSummaryLineType(line) === 'discount' && line.validUntil)
      .map(line => {
        const discountName = line.concept?.trim() || 'Descuento';
        const formattedDate = this.formatDateLong(line.validUntil);
        return `* El descuento "${discountName}" será válido si se abona la señal antes del ${formattedDate}.`;
      });
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
          ol: conditions.map((condition, index) => ({
            stack: this.compactContent([
              condition.title ? { text: condition.title, bold: true, margin: [0, 0, 0, 2] as [number, number, number, number], color: this.accentColor } : null,
              { text: condition.text }
            ]),
            margin: [0, index === 0 ? 0 : 6, 0, 6] as [number, number, number, number]
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

  private compactContent<T extends Content>(values: Array<T | null | undefined>): T[] {
    return values.filter((value): value is T => value !== null && value !== undefined);
  }

  private async convertImageToBase64(url: string): Promise<string | null> {
    if (!url || url.trim() === '') {
      return null;
    }

    try {
      const response = await fetch(url);

      // Check if the response is successful
      if (!response.ok) {
        console.warn(`Image not found or inaccessible: ${url} (${response.status})`);
        return null;
      }

      const blob = await response.blob();

      // Validate that we got an actual image
      if (!blob.type.startsWith('image/')) {
        console.warn(`Invalid image type: ${blob.type} for URL: ${url}`);
        return null;
      }

      if (blob.type === 'image/webp') {
        return this.convertWebPToPng(blob);
      }

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Error loading image:', url, error);
      return null;
    }
  }

  private convertWebPToPng(blob: Blob): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve(null);
      };
      img.src = URL.createObjectURL(blob);
    });
  }
}
