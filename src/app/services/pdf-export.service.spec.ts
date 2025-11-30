import { TestBed } from '@angular/core/testing';
import { PdfExportService, BudgetPdfPayload } from './pdf-export.service';
import pdfMake from 'pdfmake/build/pdfmake';

describe('PdfExportService', () => {
  let service: PdfExportService;
  let pdfMakeCreatePdfSpy: jasmine.Spy;
  let pdfDocSpy: jasmine.SpyObj<any>;

  const mockPayload: BudgetPdfPayload = {
    metadata: { id: 1, budgetNumber: 'PRE-001', title: 'Presupuesto' },
    customer: {
      id: 1,
      name: 'Cliente Prueba',
      address: 'Calle Falsa 123',
      city: 'Valencia',
      postalCode: '46000',
      phone: '600123456',
      email: 'cliente@test.com',
      dni: '12345678Z',
      createdAt: '2023-01-01'
    },
    blocks: [
      {
        id: 1,
        budgetId: 1,
        heading: 'Bloque 1',
        sectionTitle: 'Mobiliario',
        subtotal: 100,
        descriptions: [{ text: 'Descripción bloque', orderIndex: 0, title: 'Titulo' }],
        orderIndex: 0
      }
    ],
    materials: [
      {
        id: 1,
        reference: 'MAT-001',
        description: 'Material 1',
        quantity: 2,
        unitPrice: 50,
        totalPrice: 100,
        manufacturer: 'Fab',
        orderIndex: 0
      }
    ],
    materialTables: [
        {
            id: 1,
            title: 'Tabla 1',
            rows: [
                 {
                    id: 2,
                    reference: 'MAT-002',
                    description: 'Material 2',
                    quantity: 1,
                    unitPrice: 20,
                    totalPrice: 20,
                    manufacturer: 'Fab',
                    orderIndex: 0
                  }
            ],
            orderIndex: 0
        }
    ],
    simpleBlock: {
      id: 1,
      budgetId: 1,
      model: 'Modelo Bloque Simple',
      description: 'Desc Bloque Simple',
      price: 200,
      imageUrl: 'http://fake.url/image.jpg'
    },
    summary: {
      totalBlocks: 100,
      totalMaterials: 120,
      totalSimpleBlock: 200,
      taxableBase: 420,
      vatPercentage: 21,
      vat: 88.2,
      grandTotal: 508.2,
      additionalLines: []
    },
    generatedAt: '2023-11-29T10:00:00.000Z',
    companyLogoUrl: 'http://fake.url/logo.png',
    supplierLogoUrl: 'http://fake.url/supplier.png'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PdfExportService);

    // Mock pdfMake
    pdfDocSpy = jasmine.createSpyObj('pdfDoc', ['download', 'open', 'getBlob', 'getBuffer']);
    pdfMakeCreatePdfSpy = spyOn(pdfMake, 'createPdf').and.returnValue(pdfDocSpy);

    // Mock URL.createObjectURL
    spyOn(URL, 'createObjectURL').and.returnValue('blob:http://localhost/fake-blob');

    // Mock fetch for images
    spyOn(window, 'fetch').and.callFake(() => Promise.resolve(new Response(new Blob(['fake-image-content']))));
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('generateBudgetPdf', () => {
    it('should generate and download PDF', async () => {
      pdfDocSpy.download.and.callFake((fileName: string, cb: () => void) => {
        cb();
      });

      await service.generateBudgetPdf(mockPayload);

      expect(pdfMake.createPdf).toHaveBeenCalled();
      expect(pdfDocSpy.download).toHaveBeenCalled();
      const downloadArgs = pdfDocSpy.download.calls.mostRecent().args;
      expect(downloadArgs[0]).toBe('PRE-001.pdf');
    });

    it('should handle errors during generation', async () => {
      pdfDocSpy.download.and.throwError('Download error');

      await expectAsync(service.generateBudgetPdf(mockPayload)).toBeRejectedWithError('Download error');
    });
  });

  describe('openBudgetPdf', () => {
    it('should generate and open PDF', async () => {
      await service.openBudgetPdf(mockPayload);

      expect(pdfMake.createPdf).toHaveBeenCalled();
      expect(pdfDocSpy.open).toHaveBeenCalled();
    });
  });

  describe('getBudgetPdfBlobUrl', () => {
    it('should return a blob URL', async () => {
      pdfDocSpy.getBlob.and.callFake((cb: (blob: Blob) => void) => {
        cb(new Blob(['pdf-content'], { type: 'application/pdf' }));
      });

      const url = await service.getBudgetPdfBlobUrl(mockPayload);

      expect(pdfMake.createPdf).toHaveBeenCalled();
      expect(pdfDocSpy.getBlob).toHaveBeenCalled();
      expect(url).toBe('blob:http://localhost/fake-blob');
    });
  });

  describe('getBudgetPdfBlobUrlWithPageCount', () => {
    it('should return URL and page count', async () => {
      // Mock PDF content with page count info
      // The regex is /\/Type\s*\/Page[^s]/g so we need a char after Page that is not 's'
      const fakePdfContent = '/Type /Page\n /Type /Page\n'; // 2 pages
      const buffer = new TextEncoder().encode(fakePdfContent).buffer;

      pdfDocSpy.getBuffer.and.callFake((cb: (buffer: ArrayBuffer) => void) => {
        cb(buffer);
      });

      const result = await service.getBudgetPdfBlobUrlWithPageCount(mockPayload);

      expect(pdfMake.createPdf).toHaveBeenCalled();
      expect(pdfDocSpy.getBuffer).toHaveBeenCalled();
      expect(result.url).toBe('blob:http://localhost/fake-blob');
      expect(result.pageCount).toBe(2);
    });

    it('should default to 1 page if no matches found', async () => {
      const buffer = new TextEncoder().encode('Empty PDF').buffer;

      pdfDocSpy.getBuffer.and.callFake((cb: (buffer: ArrayBuffer) => void) => {
        cb(buffer);
      });

      const result = await service.getBudgetPdfBlobUrlWithPageCount(mockPayload);
      expect(result.pageCount).toBe(1);
    });
  });

  describe('Image handling', () => {
    it('should attempt to load images if URLs are present', async () => {
        // We need to mock FileReader to return a base64 string
        const mockFileReader = {
            readAsDataURL: function() {
                this.onloadend();
            },
            result: 'data:image/png;base64,fake-base64-data',
            onloadend: () => {}
        };
        spyOn(window, 'FileReader').and.returnValue(mockFileReader as any);

        pdfDocSpy.download.and.callFake((fileName: string, cb: () => void) => {
            cb();
        });

        await service.generateBudgetPdf(mockPayload);

        expect(window.fetch).toHaveBeenCalledWith('http://fake.url/image.jpg');
        expect(window.fetch).toHaveBeenCalledWith('http://fake.url/logo.png');
        expect(window.fetch).toHaveBeenCalledWith('http://fake.url/supplier.png');
    });

    it('should handle image loading errors gracefully', async () => {
        (window.fetch as jasmine.Spy).and.returnValue(Promise.reject('Network error'));

        pdfDocSpy.download.and.callFake((fileName: string, cb: () => void) => {
            cb();
        });

        // Should not throw
        await service.generateBudgetPdf(mockPayload);
        expect(pdfMake.createPdf).toHaveBeenCalled();
    });

    it('should convert WebP images to PNG', async () => {
        const webpBlob = new Blob(['fake-webp-content'], { type: 'image/webp' });
        const response = new Response(webpBlob);
        (window.fetch as jasmine.Spy).and.returnValue(Promise.resolve(response));

        // Spy on convertWebPToPng to ensure it's called
        // We mock the implementation because we can't load a fake blob into an Image
        const convertSpy = spyOn<any>(service, 'convertWebPToPng').and.returnValue(Promise.resolve('data:image/png;base64,converted-png'));

        const result = await (service as any).convertImageToBase64('http://fake.url/image.webp');

        expect(window.fetch).toHaveBeenCalledWith('http://fake.url/image.webp');
        expect(convertSpy).toHaveBeenCalled();
        expect(result).toBe('data:image/png;base64,converted-png');
    });

    it('should return null for empty URL', async () => {
        const result = await (service as any).convertImageToBase64('');
        expect(result).toBeNull();
        expect(window.fetch).not.toHaveBeenCalled();
    });

    it('should return null for whitespace-only URL', async () => {
        const result = await (service as any).convertImageToBase64('   ');
        expect(result).toBeNull();
        expect(window.fetch).not.toHaveBeenCalled();
    });

    it('should return null for null URL', async () => {
        const result = await (service as any).convertImageToBase64(null);
        expect(result).toBeNull();
        expect(window.fetch).not.toHaveBeenCalled();
    });

    it('should return null for undefined URL', async () => {
        const result = await (service as any).convertImageToBase64(undefined);
        expect(result).toBeNull();
        expect(window.fetch).not.toHaveBeenCalled();
    });

    it('should return null when fetch returns 400 Bad Request', async () => {
        const errorResponse = new Response(null, { status: 400, statusText: 'Bad Request' });
        (window.fetch as jasmine.Spy).and.returnValue(Promise.resolve(errorResponse));

        const warnSpy = spyOn(console, 'warn');
        const result = await (service as any).convertImageToBase64('http://fake.url/missing.png');

        expect(result).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith(
            jasmine.stringContaining('Image not found or inaccessible')
        );
    });

    it('should return null when fetch returns 404 Not Found', async () => {
        const errorResponse = new Response(null, { status: 404, statusText: 'Not Found' });
        (window.fetch as jasmine.Spy).and.returnValue(Promise.resolve(errorResponse));

        const warnSpy = spyOn(console, 'warn');
        const result = await (service as any).convertImageToBase64('http://fake.url/notfound.png');

        expect(result).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith(
            jasmine.stringContaining('Image not found or inaccessible')
        );
    });

    it('should return null when fetch returns 500 Server Error', async () => {
        const errorResponse = new Response(null, { status: 500, statusText: 'Internal Server Error' });
        (window.fetch as jasmine.Spy).and.returnValue(Promise.resolve(errorResponse));

        const result = await (service as any).convertImageToBase64('http://fake.url/error.png');
        expect(result).toBeNull();
    });

    it('should return null when response is not an image type', async () => {
        const textBlob = new Blob(['not an image'], { type: 'text/html' });
        const response = new Response(textBlob);
        (window.fetch as jasmine.Spy).and.returnValue(Promise.resolve(response));

        const warnSpy = spyOn(console, 'warn');
        const result = await (service as any).convertImageToBase64('http://fake.url/notimage.html');

        expect(result).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith(
            jasmine.stringContaining('Invalid image type')
        );
    });

    it('should return null when response is application/json', async () => {
        const jsonBlob = new Blob(['{"error": "not found"}'], { type: 'application/json' });
        const response = new Response(jsonBlob);
        (window.fetch as jasmine.Spy).and.returnValue(Promise.resolve(response));

        const result = await (service as any).convertImageToBase64('http://fake.url/api/error');
        expect(result).toBeNull();
    });

    it('should successfully convert valid PNG image', async () => {
        const pngBlob = new Blob(['fake-png-content'], { type: 'image/png' });
        const response = new Response(pngBlob);
        (window.fetch as jasmine.Spy).and.returnValue(Promise.resolve(response));

        const mockFileReader = {
            readAsDataURL: function() {
                this.onloadend();
            },
            result: 'data:image/png;base64,valid-base64-data',
            onloadend: () => {}
        };
        spyOn(window, 'FileReader').and.returnValue(mockFileReader as any);

        const result = await (service as any).convertImageToBase64('http://fake.url/valid.png');
        expect(result).toBe('data:image/png;base64,valid-base64-data');
    });

    it('should successfully convert valid JPEG image', async () => {
        const jpegBlob = new Blob(['fake-jpeg-content'], { type: 'image/jpeg' });
        const response = new Response(jpegBlob);
        (window.fetch as jasmine.Spy).and.returnValue(Promise.resolve(response));

        const mockFileReader = {
            readAsDataURL: function() {
                this.onloadend();
            },
            result: 'data:image/jpeg;base64,valid-jpeg-data',
            onloadend: () => {}
        };
        spyOn(window, 'FileReader').and.returnValue(mockFileReader as any);

        const result = await (service as any).convertImageToBase64('http://fake.url/valid.jpg');
        expect(result).toBe('data:image/jpeg;base64,valid-jpeg-data');
    });

    it('should return null when FileReader encounters an error', async () => {
        const pngBlob = new Blob(['fake-png-content'], { type: 'image/png' });
        const response = new Response(pngBlob);
        (window.fetch as jasmine.Spy).and.returnValue(Promise.resolve(response));

        const mockFileReader = {
            readAsDataURL: function() {
                this.onerror();
            },
            result: null,
            onloadend: () => {},
            onerror: () => {}
        };
        spyOn(window, 'FileReader').and.returnValue(mockFileReader as any);

        const result = await (service as any).convertImageToBase64('http://fake.url/error.png');
        expect(result).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
        (window.fetch as jasmine.Spy).and.returnValue(Promise.reject(new Error('Network error')));

        const warnSpy = spyOn(console, 'warn');
        const result = await (service as any).convertImageToBase64('http://fake.url/network-error.png');

        expect(result).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith(
            'Error loading image:',
            'http://fake.url/network-error.png',
            jasmine.any(Error)
        );
    });
  });

  // --- TESTS PARA LÍNEAS OPCIONALES EN EL RESUMEN ---
  describe('Opcional lines in summary', () => {
    function makeSummary(overrides: Partial<any> = {}, additionalLines: any[] = []) {
      return {
        totalBlocks: 1000,
        totalMaterials: 500,
        totalSimpleBlock: 200,
        vatPercentage: 21,
        vat: 0,
        taxableBase: 0,
        grandTotal: 0,
        additionalLines,
        ...overrides
      };
    }

    // Helper para buscar recursivamente en el contenido PDF
    function findInContent(content: any, predicate: (item: any) => boolean): any {
      if (!content) return null;
      if (predicate(content)) return content;

      if (Array.isArray(content)) {
        for (const item of content) {
          const found = findInContent(item, predicate);
          if (found) return found;
        }
      }

      if (typeof content === 'object') {
        for (const key of Object.keys(content)) {
          const found = findInContent(content[key], predicate);
          if (found) return found;
        }
      }

      return null;
    }

    it('should exclude optional lines from totals', () => {
      // baseSubtotal = 1000 + 500 + 200 = 1700
      // discount 10% = -170
      // adjustment = 50
      // optional = 999 (NO se suma)
      // taxableBase = 1700 - 170 + 50 = 1580
      // vat = 1580 * 0.21 = 331.80
      // grandTotal = 1580 + 331.80 = 1911.80
      const summary = makeSummary({}, [
        { concept: 'Descuento', amount: 10, conceptType: 'discount' }, // 10% de 1700 = 170
        { concept: 'Opcional', amount: 999, conceptType: 'optional' },
        { concept: 'Ajuste', amount: 50, conceptType: 'adjustment' }
      ]);
      // @ts-ignore (private method)
      const section = service.buildSummarySection(summary, [], [], undefined, undefined, undefined);

      // Buscar el total general en cualquier parte de la estructura
      const grandTotalValue = findInContent(section, (item: any) =>
        item?.style === 'sectionGrandTotal'
      );
      expect(grandTotalValue).toBeTruthy();
      // El formato esperado es '1911,80 €' (sin separador de miles para < 10000)
      expect(grandTotalValue?.text).toContain('1911,80');
    });

    it('should show optional lines in breakdown but not in total', () => {
      const summary = makeSummary({}, [
        { concept: 'Opcional', amount: 123, conceptType: 'optional' }
      ]);
      // @ts-ignore (private method)
      const section = service.buildSummarySection(summary, [], [], undefined, undefined, undefined);

      // Buscar la línea opcional en el breakdown (debe tener lineThrough)
      const optionalCell = findInContent(section, (item: any) =>
        typeof item?.text === 'string' && item.text.includes('Opcional')
      );
      expect(optionalCell).toBeTruthy();
      expect(optionalCell?.decoration).toBe('lineThrough');

      // Verificar que el total no incluye la línea opcional
      // Total esperado: (1000 + 500 + 200) * 1.21 = 2057.00
      const grandTotalValue = findInContent(section, (item: any) =>
        item?.style === 'sectionGrandTotal'
      );
      expect(grandTotalValue).toBeTruthy();
      // El formato es '2057,00 €' (sin separador de miles para < 10000)
      expect(grandTotalValue?.text).toContain('2057,00');
    });
  });
});
