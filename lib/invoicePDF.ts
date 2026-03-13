
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Business, Invoice } from '../types';

export const generateInvoicePDF = (business: Business, invoice: Invoice) => {
    const doc = new jsPDF();
    const primaryColor = [79, 70, 229]; // Indigo-600

    // Header - Logo/Name
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('BARSYNC', 20, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text('High Performance POS Terminal', 20, 32);

    // Invoice Label
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 140, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice #: ${invoice.id}`, 140, 32);
    doc.text(`Date: ${new Date(invoice.date).toLocaleDateString('en-GB')}`, 140, 37);
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 140, 42);

    // Business Info
    doc.setDrawColor(230);
    doc.line(20, 50, 190, 50);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Billed To:', 20, 60);
    
    doc.setFont('helvetica', 'normal');
    doc.text(business.name, 20, 67);
    doc.text(`Owner: ${business.ownerName}`, 20, 72);
    // doc.text(business.email, 20, 77); // Removed as it doesn't exist in type

    // Table Data
    const tableData = [
        [
            'BarSync Subscription - ' + invoice.plan,
            '1 Month',
            'Ksh ' + invoice.amount.toLocaleString(),
            'Ksh ' + invoice.amount.toLocaleString()
        ]
    ];

    autoTable(doc, {
        startY: 90,
        head: [['Description', 'Period', 'Unit Price', 'Amount']],
        body: tableData,
        headStyles: { 
            fillColor: [79, 70, 229],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        styles: {
            font: 'helvetica',
            halign: 'left',
            cellPadding: 6
        },
        columnStyles: {
            2: { halign: 'right' },
            3: { halign: 'right' }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Totals
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount:', 140, finalY + 10);
    doc.text('Ksh ' + invoice.amount.toLocaleString(), 175, finalY + 10, { align: 'right' });

    // Payment Reference / Note
    if (invoice.note) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.setFont('helvetica', 'bold');
        doc.text('Verification Message:', 20, finalY + 30);
        doc.setFont('helvetica', 'italic');
        const splitNote = doc.splitTextToSize(invoice.note, 160);
        doc.text(splitNote, 20, finalY + 37);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for choosing BarSync. For support, contact +254 757 983 954', 105, 285, { align: 'center' });

    doc.save(`Invoice_${invoice.id}.pdf`);
};
