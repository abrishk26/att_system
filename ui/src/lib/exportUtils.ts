import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportDocumentTable {
  title: string;
  columns: string[];
  rows: string[][];
}

export interface ReportDocumentKpiBlock {
  title: string;
  items: string[][];
}

export interface ReportDocument {
  title: string;
  subtitle: string;
  generated_at: string;
  executive_summary: string;
  kpis: ReportDocumentKpiBlock[];
  tables: ReportDocumentTable[];
}

export const exportToCSV = (data: any[], filename: string) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

/** UTF-8 BOM CSV opens cleanly in Microsoft Excel as a spreadsheet. */
export const exportToExcelFriendlyCsv = (data: Record<string, unknown>[], filename: string) => {
  const csv = `\uFEFF${Papa.unparse(data)}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export function openPrintableReportHtml(title: string, doc: ReportDocument) {
  const w = window.open('', '_blank');
  if (!w) return;
  
  let kpisHtml = '';
  for (const block of doc.kpis) {
    kpisHtml += `
      <div class="print-kpi-block">
        <h3>${escapeHtml(block.title)}</h3>
        <div class="print-kpi-grid">
          ${block.items.map(item => `
            <div class="print-kpi-card">
              <div class="print-kpi-label">${escapeHtml(item[0] ?? '')}</div>
              <div class="print-kpi-value">${escapeHtml(item[1] ?? '')}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  let tablesHtml = '';
  for (const t of doc.tables) {
    tablesHtml += `
      <div class="print-table-section">
        <h3>${escapeHtml(t.title)}</h3>
        <table>
          <thead>
            <tr>
              ${t.columns.map(c => `<th>${escapeHtml(c)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${t.rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
  <style>
    body{font-family:system-ui,sans-serif;padding:3rem;color:#0f172a;background:#fff;line-height:1.5;}
    .header-bar{border-bottom:3px solid #2563eb;padding-bottom:1.5rem;margin-bottom:2rem;}
    h1{font-size:1.8rem;margin:0 0 0.5rem;color:#1e3a8a;}
    .subtitle{font-size:1rem;color:#475569;margin:0 0 0.5rem;}
    .meta{color:#64748b;font-size:0.8rem;display:flex;gap:1.5rem;}
    .summary-box{background:#f8fafc;border-left:4px solid #2563eb;padding:1.25rem;margin-bottom:2rem;border-radius:0 8px 8px 0;}
    .summary-title{font-weight:700;margin-bottom:0.5rem;color:#1e293b;font-size:0.9rem;text-transform:uppercase;letter-spacing:0.05em;}
    .summary-text{color:#334155;font-size:0.9rem;}
    h3{font-size:1.1rem;margin:1.5rem 0 0.75rem;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:0.5rem;}
    .print-kpi-block{margin-bottom:2rem;}
    .print-kpi-grid{display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:1rem;}
    .print-kpi-card{background:#f1f5f9;padding:1rem;border-radius:8px;text-align:center;}
    .print-kpi-label{font-size:0.75rem;color:#475569;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.25rem;}
    .print-kpi-value{font-size:1.5rem;font-weight:800;color:#1e293b;}
    .print-table-section{margin-bottom:2.5rem;}
    table{border-collapse:collapse;width:100%;margin-bottom:2rem;font-size:0.8rem;}
    th,td{border:1px solid #e2e8f0;padding:8px 10px;text-align:left;}
    th{background:#f8fafc;font-weight:600;color:#1e293b;}
    tr:nth-child(even) td{background:#fafbfc;}
    @media print { 
      body { padding: 1rem; }
      .header-bar { border-bottom-color: #000; }
      .summary-box { background: #fff; border: 1px solid #ccc; }
      .print-kpi-card { background: #fff; border: 1px solid #ccc; }
    }
  </style></head><body>
  <div class="header-bar">
    <h1>${escapeHtml(title)}</h1>
    <div class="subtitle">${escapeHtml(doc.subtitle)}</div>
    <div class="meta">
      <span><strong>Generated:</strong> ${new Date(doc.generated_at).toLocaleString()}</span>
      <span><strong>Platform:</strong> Attendance Intelligence Portal</span>
    </div>
  </div>
  
  <div class="summary-box">
    <div class="summary-title">Executive Summary</div>
    <div class="summary-text">${escapeHtml(doc.executive_summary)}</div>
  </div>
  
  ${kpisHtml}
  ${tablesHtml}
  </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 250);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const exportToPDF = (
    title: string,
    columns: { header: string; dataKey: string }[],
    data: any[],
    filename: string
) => {
    const doc = new jsPDF();
    
    // Header Bar Styling
    doc.setFillColor(37, 99, 235); // Blue-600
    doc.rect(0, 0, 210, 8, 'F');
    
    // Add title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 58, 138); // Dark Blue
    doc.text(title, 14, 24);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}  |  Attendance Intelligence Platform`, 14, 32);
    
    // Horizontal divider line
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(14, 36, 196, 36);
    
    autoTable(doc, {
        head: [columns.map(col => col.header)],
        body: data.map(row => columns.map(col => row[col.dataKey])),
        startY: 42,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 3, font: 'helvetica' },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' }, // Blue-600
        alternateRowStyles: { fillColor: [248, 250, 252] }, // Slate-50
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          // Footer page numbering
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(`Page ${data.pageNumber}`, 196, 285, { align: 'right' });
          doc.text('CONFIDENTIAL - FOR INTERNAL ACADEMIC USE ONLY', 14, 285);
        }
    });
    
    doc.save(`${filename}.pdf`);
};

export const exportInstitutionalPDF = (doc: ReportDocument, filename: string) => {
  const pdf = new jsPDF();
  
  // 1. Draw top brand strip
  pdf.setFillColor(37, 99, 235); // Primary Blue-600
  pdf.rect(0, 0, 210, 8, 'F');
  
  // 2. Add Title & Subtitle
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(30, 58, 138);
  pdf.text(doc.title, 14, 24);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(71, 85, 105);
  pdf.text(doc.subtitle, 14, 30);
  
  // Meta block
  pdf.setFontSize(9);
  pdf.setTextColor(148, 163, 184);
  const dateStr = new Date(doc.generated_at).toLocaleString();
  pdf.text(`Generated: ${dateStr}  |  Attendance Intelligence Platform`, 14, 36);
  
  // Divider
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.5);
  pdf.line(14, 40, 196, 40);
  
  // 3. Executive Summary Box
  pdf.setFillColor(248, 250, 252);
  pdf.rect(14, 45, 182, 30, 'F');
  
  pdf.setDrawColor(37, 99, 235);
  pdf.setLineWidth(1.5);
  pdf.line(14, 45, 14, 75);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(15, 23, 42);
  pdf.text('EXECUTIVE SUMMARY', 18, 51);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(51, 65, 85);
  
  // Text wrapping for summary
  const splitText = pdf.splitTextToSize(doc.executive_summary, 172);
  pdf.text(splitText, 18, 57);
  
  let currentY = 82;
  
  // 4. Render KPIs
  if (doc.kpis && doc.kpis.length > 0) {
    for (const block of doc.kpis) {
      if (currentY > 250) {
        pdf.addPage();
        currentY = 20;
      }
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(30, 58, 138);
      pdf.text(block.title.toUpperCase(), 14, currentY);
      currentY += 4;
      
      // Draw a grid of small KPI cards if possible or list them elegantly
      const items = block.items || [];
      const colsCount = 3;
      const cardWidth = 58;
      const cardHeight = 16;
      const gap = 4;
      
      let gridX = 14;
      let gridY = currentY;
      
      items.forEach((item, index) => {
        const colIdx = index % colsCount;
        const rowIdx = Math.floor(index / colsCount);
        
        const xPos = gridX + colIdx * (cardWidth + gap);
        const yPos = gridY + rowIdx * (cardHeight + gap);
        
        // Draw card background
        pdf.setFillColor(241, 245, 249);
        pdf.rect(xPos, yPos, cardWidth, cardHeight, 'F');
        
        // Label
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(71, 85, 105);
        const splitLabel = pdf.splitTextToSize(item[0]?.toUpperCase() ?? '', cardWidth - 4);
        pdf.text(splitLabel, xPos + 3, yPos + 5);
        
        // Value
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(37, 99, 235);
        pdf.text(item[1] ?? '', xPos + 3, yPos + 12);
      });
      
      const totalRows = Math.ceil(items.length / colsCount);
      currentY += totalRows * (cardHeight + gap) + 6;
    }
  }
  
  // 5. Render Tables
  if (doc.tables && doc.tables.length > 0) {
    for (const t of doc.tables) {
      if (currentY > 240) {
        pdf.addPage();
        currentY = 20;
      }
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(30, 58, 138);
      pdf.text(t.title.toUpperCase(), 14, currentY);
      currentY += 4;
      
      autoTable(pdf, {
        head: [t.columns],
        body: t.rows,
        startY: currentY,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
      });
      
      currentY = (pdf as any).lastAutoTable.finalY + 12;
    }
  }
  
  // Draw footer page numbers on all pages
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    
    // Horizontal line above footer
    pdf.setDrawColor(241, 245, 249);
    pdf.setLineWidth(0.5);
    pdf.line(14, 278, 196, 278);
    
    pdf.text(`Page ${i} of ${pageCount}`, 196, 284, { align: 'right' });
    pdf.text('CONFIDENTIAL - INSTITUTIONAL ATTENDANCE REPORT', 14, 284);
  }
  
  pdf.save(`${filename}.pdf`);
};
