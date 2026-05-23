import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginateResponse } from '../../common/dto/pagination.dto';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(pagination: PaginationDto & { status?: InvoiceStatus }) {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 20;
    const { search, status } = pagination;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (search) where.invoiceNumber = { contains: search };

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where, skip, take: limit,
        include: {
          customer: { select: { firstName: true, lastName: true } },
          user: { select: { firstName: true, lastName: true } },
          sale: { select: { saleNumber: true, payments: true } },
        },
        orderBy: { issuedAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return paginateResponse(invoices, total, page, limit);
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        user: { select: { firstName: true, lastName: true } },
        sale: {
          include: {
            saleDetails: { include: { product: { include: { category: true } } } },
            payments: true,
          },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    return invoice;
  }

  async cancel(id: string, reason: string) {
    const invoice = await this.findOne(id);
    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('La factura ya está anulada');
    }
    return this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED, cancelReason: reason, cancelledAt: new Date() },
    });
  }

  async getInvoiceData(id: string) {
    const invoice = await this.findOne(id);
    return {
      ...invoice,
      generatedAt: new Date().toISOString(),
    };
  }

  async generatePdf(id: string): Promise<{ buffer: Buffer; filename: string }> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PdfPrinter = require('pdfmake/src/printer') as any;
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };
    const invoice = await this.getInvoiceData(id);
    const printer = new PdfPrinter(fonts);
    const docDef = this.buildInvoiceDocDef(invoice);
    const doc = printer.createPdfKitDocument(docDef);
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
    return { buffer, filename: `factura-${invoice.invoiceNumber}.pdf` };
  }

  private buildInvoiceDocDef(invoice: any): object {
    const fmt = (n: any) => `Bs. ${parseFloat(n).toFixed(2)}`;
    const fmtDT = (d: any) =>
      new Date(d).toLocaleString('es-BO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

    const INDIGO = '#6366f1';
    const INDIGO_DARK = '#4f46e5';
    const STONE = '#78716c';
    const DARK = '#1c1917';
    const RED = '#dc2626';
    const LIGHT_BG = '#f8f7ff';
    const BORDER_COLOR = '#e0e7ff';
    const STATUS_LABELS: Record<string, string> = { ACTIVE: 'ACTIVA', CANCELLED: 'ANULADA', PAID: 'PAGADA' };
    const STATUS_COLORS: Record<string, string> = { ACTIVE: '#22c55e', CANCELLED: '#ef4444', PAID: '#3b82f6' };
    const PAYMENT_LABELS: Record<string, string> = { CASH: 'Efectivo', QR: 'QR', CARD: 'Tarjeta', TRANSFER: 'Transferencia' };

    const noBorderLayout = {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 3,
      paddingBottom: () => 3,
    };

    const customer = invoice.customer;
    const customerName = customer
      ? `${customer.firstName} ${customer.lastName}`
      : 'Cliente ocasional';
    const issuedBy = invoice.user
      ? `${invoice.user.firstName} ${invoice.user.lastName}`
      : '-';
    const details: any[] = invoice.sale?.saleDetails ?? [];
    const payments: any[] = invoice.sale?.payments ?? [];
    const globalDiscount = parseFloat(invoice.sale?.discount ?? 0);
    const hasItemDiscounts = details.some((d) => parseFloat(d.discount ?? 0) > 0);
    const totalItemDiscounts = details.reduce((s, d) => s + parseFloat(d.discount ?? 0), 0);
    const grossAmount = details.reduce((s, d) => s + parseFloat(d.quantity) * parseFloat(d.unitPrice), 0);

    // ── Products table ──────────────────────────────────────────────────────
    const thCell = (text: string, align: string = 'left') => ({
      text, bold: true, fontSize: 9, color: '#ffffff', fillColor: INDIGO, alignment: align,
    });
    const tableHeader = hasItemDiscounts
      ? [thCell('Producto'), thCell('Cant.', 'center'), thCell('Precio unit.', 'right'), thCell('Descuento', 'right'), thCell('Subtotal', 'right')]
      : [thCell('Producto'), thCell('Cant.', 'center'), thCell('Precio unit.', 'right'), thCell('Subtotal', 'right')];

    const tableBody = details.length > 0
      ? details.map((d, idx) => {
          const itemDiscount = parseFloat(d.discount ?? 0);
          const sub = parseFloat(d.quantity) * parseFloat(d.unitPrice) - itemDiscount;
          const fill = idx % 2 !== 0 ? '#faf9f8' : null;
          const base = [
            { text: d.product?.name ?? '-', fillColor: fill, fontSize: 9 },
            { text: String(d.quantity), alignment: 'center', fillColor: fill, fontSize: 9 },
            { text: fmt(d.unitPrice), alignment: 'right', fillColor: fill, fontSize: 9 },
          ];
          if (hasItemDiscounts) {
            return [...base,
              { text: itemDiscount > 0 ? `-${fmt(itemDiscount)}` : '-', alignment: 'right', color: itemDiscount > 0 ? RED : STONE, fillColor: fill, fontSize: 9 },
              { text: fmt(sub), alignment: 'right', bold: true, fillColor: fill, fontSize: 9 },
            ];
          }
          return [...base, { text: fmt(sub), alignment: 'right', bold: true, fillColor: fill, fontSize: 9 }];
        })
      : [[{
          text: 'Sin productos registrados', colSpan: hasItemDiscounts ? 5 : 4,
          alignment: 'center', color: STONE, fontSize: 9,
        }, ...(hasItemDiscounts ? [{}, {}, {}, {}] : [{}, {}, {}])]];

    const tableWidths = hasItemDiscounts ? ['*', 28, 62, 55, 55] : ['*', 28, 62, 55];

    // ── Totals table (2-col table with border above TOTAL row) ────────────
    const totalsBody: any[][] = [];
    const tRow = (label: string, value: string, color = STONE, bold = false) => [
      { text: label, fontSize: 9, color, bold },
      { text: value, fontSize: 9, color, bold, alignment: 'right' },
    ];

    if (hasItemDiscounts) {
      totalsBody.push(tRow('Precio bruto', fmt(grossAmount)));
      totalsBody.push(tRow('Desc. por producto', `-${fmt(totalItemDiscounts)}`, RED, true));
    }
    if (hasItemDiscounts || globalDiscount > 0) {
      totalsBody.push(tRow('Subtotal', fmt(invoice.subtotal)));
    }
    if (globalDiscount > 0) {
      totalsBody.push(tRow('Desc. general', `-${fmt(globalDiscount)}`, RED, true));
    }
    if (parseFloat(invoice.tax) > 0) {
      totalsBody.push(tRow('IVA', fmt(invoice.tax)));
    }
    // TOTAL row — always last
    totalsBody.push([
      { text: 'TOTAL', fontSize: 14, bold: true, color: INDIGO_DARK },
      { text: fmt(invoice.total), fontSize: 14, bold: true, color: INDIGO_DARK, alignment: 'right' },
    ]);

    const totalRowIndex = totalsBody.length - 1;
    const totalsTableDef = {
      table: { widths: ['*', 'auto'], body: totalsBody },
      layout: {
        hLineWidth: (i: number) => i === totalRowIndex ? 1.5 : 0,
        vLineWidth: () => 0,
        hLineColor: () => INDIGO,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: (i: number) => i === totalRowIndex ? 7 : 3,
        paddingBottom: () => 3,
      },
    };

    // ── Payments list ────────────────────────────────────────────────────
    const paymentsBody: any[][] = payments.map((p) => [
      { text: PAYMENT_LABELS[p.method] ?? p.method, fontSize: 9, color: STONE },
      { text: fmt(p.amount), fontSize: 9, color: STONE, alignment: 'right' },
    ]);

    const paymentsCell: any = payments.length > 0
      ? {
          border: [false, false, false, false],
          stack: [
            { text: 'FORMA DE PAGO', fontSize: 7, bold: true, color: INDIGO, margin: [0, 0, 0, 6] },
            {
              table: { widths: ['*', 'auto'], body: paymentsBody },
              layout: { ...noBorderLayout },
            },
          ],
        }
      : { border: [false, false, false, false], text: '' };

    const totalsCell: any = {
      border: [false, false, false, false],
      ...totalsTableDef,
    };

    // ── Bottom section as outer table ────────────────────────────────────
    const bottomSection = {
      table: {
        widths: ['*', 200],
        body: [[paymentsCell, totalsCell]],
      },
      layout: 'noBorders',
      margin: [0, 8, 0, 0],
    };

    // ── Info boxes (client + emission) ───────────────────────────────────
    const infoBox = (title: string, rows: any[]) => ({
      border: [false, false, false, false],
      fillColor: LIGHT_BG,
      stack: [
        {
          table: { widths: ['*'], body: [[{ text: title, fontSize: 7, bold: true, color: INDIGO, border: [false, false, false, false], margin: [0, 0, 0, 4] }]] },
          layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => LIGHT_BG },
        },
        ...rows,
      ],
      margin: [6, 6, 6, 6],
    });

    const clientRows: any[] = [
      { text: customerName, fontSize: 11, bold: true, color: DARK },
      ...(customer?.phone ? [{ text: `Tel: ${customer.phone}`, fontSize: 9, color: STONE }] : []),
      ...(customer?.email ? [{ text: customer.email, fontSize: 9, color: STONE }] : []),
      ...(customer?.address ? [{ text: customer.address, fontSize: 9, color: STONE }] : []),
    ];
    const emissionRows: any[] = [
      { text: `Por: ${issuedBy}`, fontSize: 11, bold: true, color: DARK },
      { text: fmtDT(invoice.issuedAt), fontSize: 9, color: STONE },
      ...(invoice.notes ? [{ text: `Nota: ${invoice.notes}`, fontSize: 9, color: STONE }] : []),
    ];

    const infoSection = {
      table: {
        widths: ['*', '*'],
        body: [[infoBox('CLIENTE', clientRows), infoBox('EMISION', emissionRows)]],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => BORDER_COLOR,
        vLineColor: () => BORDER_COLOR,
        fillColor: () => LIGHT_BG,
      },
      margin: [0, 0, 0, 16],
    };

    return {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 50],
      defaultStyle: { font: 'Helvetica', fontSize: 10, color: DARK },
      content: [
        // ── Header ──────────────────────────────────────────────────────
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'Sistema Bakery', fontSize: 20, bold: true, color: INDIGO },
                { text: 'Pasteleria & Panaderia', fontSize: 9, color: STONE, margin: [0, 2, 0, 0] },
              ],
            },
            {
              width: 'auto',
              stack: [
                { text: `FACTURA ${invoice.invoiceNumber}`, fontSize: 14, bold: true, alignment: 'right' },
                { text: STATUS_LABELS[invoice.status] ?? invoice.status, fontSize: 9, bold: true, alignment: 'right', color: STATUS_COLORS[invoice.status] ?? INDIGO, margin: [0, 3, 0, 2] },
                { text: `Emitida: ${fmtDT(invoice.issuedAt)}`, fontSize: 9, alignment: 'right', color: STONE },
                ...(invoice.sale?.saleNumber ? [{ text: `Venta: ${invoice.sale.saleNumber}`, fontSize: 9, alignment: 'right', color: STONE }] : []),
              ],
            },
          ],
          margin: [0, 0, 0, 6],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineColor: INDIGO, lineWidth: 2 }], margin: [0, 0, 0, 14] },
        // ── Info boxes ──────────────────────────────────────────────────
        infoSection,
        // ── Products table ──────────────────────────────────────────────
        {
          table: { headerRows: 1, widths: tableWidths, body: [tableHeader, ...tableBody] },
          layout: {
            hLineWidth: (i: number) => (i === 0 || i === 1) ? 0 : 0.5,
            vLineWidth: () => 0,
            hLineColor: () => '#e7e5e4',
          },
          margin: [0, 0, 0, 4],
        },
        // ── Payments + Totals ────────────────────────────────────────────
        bottomSection,
        // ── Cancelled notice ─────────────────────────────────────────────
        ...(invoice.status === 'CANCELLED'
          ? [{
              text: `FACTURA ANULADA${invoice.cancelReason ? ` - ${invoice.cancelReason}` : ''}${invoice.cancelledAt ? ` (${fmtDT(invoice.cancelledAt)})` : ''}`,
              fontSize: 10, bold: true, color: RED, margin: [0, 16, 0, 0],
            }]
          : []),
      ],
      footer: () => ({
        text: `Documento generado el ${fmtDT(new Date())} - Sistema Bakery`,
        alignment: 'center', fontSize: 8, color: '#a8a29e', margin: [40, 8, 40, 0],
      }),
    };
  }
}
