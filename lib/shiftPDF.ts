import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, Shift } from '../types';

const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-KE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const generateShiftPDF = (shift: Shift, businessName: string = 'BarSync', shiftSales: Sale[] = []) => {
    const doc = new jsPDF();
    const primaryColor: [number, number, number] = [15, 23, 42]; // slate-900
    const accentColor: [number, number, number] = [99, 102, 241]; // indigo-500
    const mutedColor: [number, number, number] = [100, 116, 139]; // slate-400

    // ── HEADER ──────────────────────────────────────────────────────────
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 38, 'F');

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('SHIFT REPORT', 20, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 190, 210);
    doc.text(businessName.toUpperCase(), 20, 26);
    doc.text('Reconciliation & Performance Record', 20, 32);

    // Shift ID & Status (top right)
    doc.setFontSize(9);
    doc.setTextColor(180, 190, 210);
    doc.text(`ID: ${shift.id}`, 190, 18, { align: 'right' });
    const statusColor = shift.status === 'OPEN' ? ([52, 211, 153] as [number, number, number]) : ([148, 163, 184] as [number, number, number]);
    doc.setTextColor(...statusColor);
    doc.setFont('helvetica', 'bold');
    doc.text(shift.status, 190, 26, { align: 'right' });

    // ── META: Duration & Staff ────────────────────────────────────────────
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    const metaY = 48;
    doc.setFontSize(7.5);
    doc.setTextColor(...accentColor);
    doc.setFont('helvetica', 'bold');
    doc.text('SHIFT DURATION', 20, metaY);
    doc.text('STAFF IN CHARGE', 105, metaY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.text(`Start: ${formatDateTime(shift.startTime)}`, 20, metaY + 6);
    doc.text(`End:   ${shift.endTime ? formatDateTime(shift.endTime) : 'Still running'}`, 20, metaY + 12);

    doc.text(`Opened By: ${shift.openedBy}`, 105, metaY + 6);
    doc.text(`Closed By: ${shift.closedBy || '--'}`, 105, metaY + 12);

    doc.setDrawColor(226, 232, 240);
    doc.line(20, metaY + 18, 190, metaY + 18);

    // ── FINANCIAL SUMMARY ────────────────────────────────────────────────
    const finY = metaY + 26;
    doc.setFontSize(7.5);
    doc.setTextColor(...accentColor);
    doc.setFont('helvetica', 'bold');
    doc.text('FINANCIAL BREAKDOWN', 20, finY);

    const finData = [
        ['Net Sales', `Ksh ${shift.totalSales.toLocaleString()}`],
        ['Cash', `Ksh ${shift.cashTotal.toLocaleString()}`],
        ['M-Pesa', `Ksh ${shift.mpesaTotal.toLocaleString()}`],
        ['Card', `Ksh ${shift.cardTotal.toLocaleString()}`],
        ['Transactions', `${shift.transactionsCount} orders`],
    ];

    autoTable(doc, {
        startY: finY + 4,
        body: finData,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 4,
            textColor: [30, 41, 59],
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50, fillColor: [248, 250, 252] },
            1: { halign: 'right', fontStyle: 'bold', fillColor: [255, 255, 255] },
        },
        margin: { left: 20, right: 20 },
    });

    // ── TRANSACTION LOG ──────────────────────────────────────────────────
    let txY = (doc as any).lastAutoTable.finalY + 10;
    if (txY > doc.internal.pageSize.height - 20) {
        doc.addPage();
        txY = 20;
    }
    doc.setFontSize(7.5);
    doc.setTextColor(...accentColor);
    doc.setFont('helvetica', 'bold');
    doc.text('TRANSACTION LOG', 20, txY);

    const completedSales = shiftSales.filter(s => s.status !== 'CANCELLED');

    if (completedSales.length > 0) {
        const txRows = completedSales.map((s) => [
            s.ticketNumber ? `#${s.ticketNumber}` : '--',
            new Date(s.date).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
            s.items.map(i => `${i.name} x${i.quantity}`).join(', '),
            s.salesPerson,
            s.paymentMethod,
            `Ksh ${s.totalAmount.toLocaleString()}`,
        ]);

        autoTable(doc, {
            startY: txY + 4,
            head: [['Ticket', 'Time', 'Items', 'Staff', 'Method', 'Amount']],
            body: txRows,
            theme: 'striped',
            headStyles: {
                fillColor: accentColor,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 7.5,
            },
            styles: {
                font: 'helvetica',
                fontSize: 7.5,
                cellPadding: 3,
                textColor: [30, 41, 59],
                overflow: 'linebreak',
            },
            columnStyles: {
                0: { cellWidth: 14 },
                1: { cellWidth: 16 },
                2: { cellWidth: 60 },
                3: { cellWidth: 28 },
                4: { cellWidth: 20 },
                5: { halign: 'right', fontStyle: 'bold', cellWidth: 28 },
            },
            margin: { left: 20, right: 20 },
        });
    } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(...mutedColor);
        doc.text('No transactions recorded for this shift.', 20, txY + 10);
    }

    // ── STOCK MOVEMENT TABLE ─────────────────────────────────────────────
    let stockY = (doc as any).lastAutoTable?.finalY + 10 || txY + 20;
    if (stockY > doc.internal.pageSize.height - 20) {
        doc.addPage();
        stockY = 20;
    }
    doc.setFontSize(7.5);
    doc.setTextColor(...accentColor);
    doc.setFont('helvetica', 'bold');
    doc.text('STOCK MOVEMENT', 20, stockY);

    const stockRows = shift.openingStockSnapshot.map((open) => {
        const close = shift.closingStockSnapshot?.find((c) => c.productId === open.productId);
        const sold = shiftSales
            .filter((s) => s.status !== 'CANCELLED')
            .reduce((total, sale) => {
                const item = sale.items.find((i) => i.id === open.productId);
                return total + (item ? item.quantity : 0);
            }, 0);
        const expected = open.quantity - sold;
        const variance = close ? close.quantity - expected : 0;
        return [
            open.productName,
            String(open.quantity),
            close ? String(close.quantity) : '--',
            String(sold),
            variance === 0 ? 'OK' : variance > 0 ? `+${variance}` : String(variance),
        ];
    });

    if (stockRows.length > 0) {
        autoTable(doc, {
            startY: stockY + 4,
            head: [['Item', 'Opening', 'Closing', 'Sold', 'Variance']],
            body: stockRows,
            theme: 'striped',
            headStyles: {
                fillColor: primaryColor,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8,
            },
            styles: {
                font: 'helvetica',
                fontSize: 8.5,
                cellPadding: 4,
                textColor: [30, 41, 59],
            },
            columnStyles: {
                1: { halign: 'center' },
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'center', fontStyle: 'bold' },
            },
            margin: { left: 20, right: 20 },
        });
    } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(...mutedColor);
        doc.text('No stock snapshot recorded for this shift.', 20, stockY + 10);
    }

    // ── TRANSFERRED TABS ─────────────────────────────────────────────────
    if (shift.openTabsTransferred && shift.openTabsTransferred.length > 0) {
        let tabY = (doc as any).lastAutoTable?.finalY + 10 || stockY + 20;
        if (tabY > doc.internal.pageSize.height - 20) {
            doc.addPage();
            tabY = 20;
        }
        doc.setFontSize(7.5);
        doc.setTextColor(...accentColor);
        doc.setFont('helvetica', 'bold');
        doc.text('TRANSFERRED OPEN TABS', 20, tabY);

        const tabRows = shift.openTabsTransferred.map((t) => [
            t.name,
            `Ksh ${t.amount.toLocaleString()}`,
        ]);

        autoTable(doc, {
            startY: tabY + 4,
            head: [['Customer / Tab', 'Amount']],
            body: tabRows,
            theme: 'plain',
            headStyles: {
                fillColor: [255, 247, 237],
                textColor: [154, 52, 18],
                fontStyle: 'bold',
                fontSize: 8,
            },
            styles: { fontSize: 9, cellPadding: 4 },
            columnStyles: { 1: { halign: 'right' } },
            margin: { left: 20, right: 20 },
        });
    }

    // ── FOOTER ─────────────────────────────────────────────────────────
    doc.setFontSize(7.5);
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'normal');
    doc.text(
        `Generated by BarSync POS  •  ${new Date().toLocaleString('en-KE')}  •  For internal use only`,
        105,
        290,
        { align: 'center' }
    );

    doc.save(`ShiftReport_${shift.id}.pdf`);
};
