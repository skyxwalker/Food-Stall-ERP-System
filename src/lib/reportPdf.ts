import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Item, Sale } from '@/types';

export function downloadFoodStallReportPdf(params: {
  items: Item[];
  sales: Sale[];
  dateFrom: string;
  dateTo: string;
  totalCost: number;
  totalNetSales: number;
  totalProfitOrLoss: number;
}) {
  const { items, sales, dateFrom, dateTo, totalCost, totalNetSales, totalProfitOrLoss } = params;

  const qtyByItemId = new Map<string, number>();
  items.forEach((i) => qtyByItemId.set(i.id, 0));
  sales.forEach((sale) => {
    sale.items.forEach((oi) => {
      qtyByItemId.set(oi.itemId, (qtyByItemId.get(oi.itemId) || 0) + oi.qty);
    });
  });

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('STMC Yuvajanasakhyam Food Stall Report', 40, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Period: ${dateFrom} to ${dateTo}`, 40, 66);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Items sold', 40, 96);

  const rows = items.map((i) => [i.name, String(qtyByItemId.get(i.id) || 0)]);

  autoTable(doc, {
    startY: 110,
    head: [['Item', 'Qty sold']],
    body: rows,
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [30, 30, 40], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 380 },
      1: { cellWidth: 120, halign: 'right' },
    },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 110;
  const y = finalY + 24;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total cost: ₹${Math.round(totalCost).toLocaleString()}`, 40, y);
  doc.text(`Total net sales: ₹${Math.round(totalNetSales).toLocaleString()}`, 40, y + 20);
  doc.text(`Total profit or loss: ₹${Math.round(totalProfitOrLoss).toLocaleString()}`, 40, y + 40);

  const fileName = `food-stall-report_${dateFrom}_to_${dateTo}.pdf`;
  doc.save(fileName);
}
