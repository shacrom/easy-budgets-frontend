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
    countertop: {
      id: 1,
      budgetId: 1,
      model: 'Modelo Encimera',
      description: 'Desc Encimera',
      price: 200,
      imageUrl: 'http://fake.url/image.jpg'
    },
    summary: {
      totalBlocks: 100,
      totalMaterials: 120,
      totalCountertop: 200,
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
  });
});
