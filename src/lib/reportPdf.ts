import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Item, Sale } from '@/types';

export function downloadFoodStallReportPdf(params: {
  items: Item[];
  sales: Sale[];
  totalCost: number;
  totalNetSales: number;
  totalProfitOrLoss: number;
}) {
  const { items, sales, totalCost, totalNetSales, totalProfitOrLoss } = params;

  // ---------- Date ----------
  const today = new Date();
  const reportDate = today.toLocaleDateString('en-GB'); // dd/MM/yyyy

  // ---------- Qty aggregation ----------
  const qtyByItemId = new Map<string, number>();
  items.forEach(i => qtyByItemId.set(i.id, 0));
  sales.forEach(sale => {
    sale.items.forEach(oi => {
      qtyByItemId.set(
        oi.itemId,
        (qtyByItemId.get(oi.itemId) || 0) + oi.qty
      );
    });
  });

  // ---------- PDF ----------
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // ---------- Header ----------
  doc.setFillColor(34, 40, 49);
  doc.rect(0, 0, pageWidth, 80, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255);
  doc.text('STMC Yuvajanasakhyam', 40, 40);
  doc.setFontSize(11);
  doc.text('Food Stall Sales Report', 40, 60);

  doc.setFont('helvetica', 'normal');
  doc.text(`Report Date: ${reportDate}`, pageWidth - 180, 60);

  doc.setTextColor(0);

  // ---------- Table First ----------
  const rows = items.map(i => [
    i.name,
    String(qtyByItemId.get(i.id) || 0)
  ]);

  autoTable(doc, {
    startY: 100,
    head: [['Item Name', 'Quantity Sold']],
    body: rows,
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 8,
    },
    headStyles: {
      fillColor: [34, 40, 49],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    },
    columnStyles: {
      0: { cellWidth: 360 },
      1: { cellWidth: 120, halign: 'right' }
    }
  });

  const finalY =
    (doc as unknown as { lastAutoTable?: { finalY: number } })
      .lastAutoTable?.finalY ?? 140;

  // ---------- KPI Cards After Table ----------
  const kpiY = finalY + 30;

  const drawCard = (x: number, title: string, value: string) => {
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(x, kpiY, 160, 70, 8, 8, 'F');

    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(title, x + 14, kpiY + 25);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30);
    doc.text(value, x + 14, kpiY + 50);
  };

  drawCard(40, 'Total Cost', `${Math.round(totalCost).toLocaleString()}`);
  drawCard(220, 'Total Sales', `${Math.round(totalNetSales).toLocaleString()}`);
  drawCard(400, 'Profit / Loss', `${Math.round(totalProfitOrLoss).toLocaleString()}`);

  // ---------- Save ----------
  const fileName = `food-stall-report_${reportDate.replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
}
