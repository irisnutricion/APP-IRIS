import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

export const generateSchemaPdf = async (nutritionist, patient = null) => {
    // 1. Configuración inicial
    const doc = new jsPDF('l', 'mm', 'a4'); // 'l' for landscape
    let currentPage = 1;
    let yPos = 20;

    // Colores corporativos (coherentes con planPdfGenerator)
    const primaryColor = [40, 72, 58]; // #28483a
    const brandLight = [227, 246, 237];   // #e3f6ed
    const secondaryColor = [208, 154, 132]; // #d09a84
    const textColor = [60, 60, 60];
    const lightColor = [150, 150, 150];

    // Márgenes (Landscape)
    const margins = { top: 20, right: 15, bottom: 25, left: 15 };
    const pageWidth = 297;
    const pageHeight = 210;

    // Días y Comidas
    const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const MEALS = ['Desayuno', 'Almuerzo', 'Comida', 'Merienda', 'Cena'];

    // Plantilla guardada o por defecto
    const schemaMatrix = nutritionist?.weekly_schema || {};

    // 2. Utilidad para cargar imágenes
    const loadImageAsBase64 = async (url) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error(`Error loading image from ${url}:`, error);
            return null;
        }
    };

    // Pre-cargar logos
    const logoImg = await loadImageAsBase64('/covers/logo rosa.png');
    const mailLogoImg = await loadImageAsBase64('/covers/logo gmail.png');
    const igLogoImg = await loadImageAsBase64('/covers/logo instagram.png');
    const tiktokLogoImg = await loadImageAsBase64('/covers/logo tiktok.png');

    // 3. Funciones de dibujo compartidas
    const drawHeader = (title) => {
        // Logo superior izquierdo
        if (logoImg) {
            const format = logoImg.startsWith('/9j/') ? 'JPEG' : 'PNG';
            doc.addImage(logoImg, format, margins.left, 5, 20, 20, undefined, 'FAST');
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.text(title, pageWidth / 2, 16, { align: 'center' });

        // Línea separadora
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.5);
        doc.line(margins.left, 25, pageWidth - margins.right, 25);

        yPos = 35; // Position below header
    };

    const drawFooter = async (pageNumber) => {
        const footerY = pageHeight - 10;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...primaryColor);

        // Phone (left)
        const phone = "633 67 45 63";
        doc.text(phone, margins.left, footerY);

        // Contact info (center)
        const emailContact = "info@irisnutricion.com";
        const igContact = "iris_nutricion";
        const tiktokContact = "iris_nutricion";

        const iconSize = 4;
        const spacing = 4;

        let totalWidth = 0;
        if (mailLogoImg) totalWidth += iconSize + 1;
        totalWidth += doc.getTextWidth(emailContact) + spacing;
        totalWidth += doc.getTextWidth("|") + spacing;
        if (igLogoImg) totalWidth += iconSize + 1;
        totalWidth += doc.getTextWidth(igContact) + spacing;
        totalWidth += doc.getTextWidth("|") + spacing;
        if (tiktokLogoImg) totalWidth += iconSize + 1;
        totalWidth += doc.getTextWidth(tiktokContact);

        let currentX = (pageWidth - totalWidth) / 2;

        if (mailLogoImg) {
            const format = mailLogoImg.startsWith('/9j/') ? 'JPEG' : 'PNG';
            doc.addImage(mailLogoImg, format, currentX, footerY - 3, iconSize, iconSize, undefined, 'FAST');
            currentX += iconSize + 1;
        }
        doc.text(emailContact, currentX, footerY);
        currentX += doc.getTextWidth(emailContact) + spacing;

        doc.setTextColor(...lightColor);
        doc.text("|", currentX, footerY);
        doc.setTextColor(...primaryColor);
        currentX += doc.getTextWidth("|") + spacing;

        if (igLogoImg) {
            const format = igLogoImg.startsWith('/9j/') ? 'JPEG' : 'PNG';
            doc.addImage(igLogoImg, format, currentX, footerY - 3, iconSize, iconSize, undefined, 'FAST');
            currentX += iconSize + 1;
        }
        doc.text(igContact, currentX, footerY);
        currentX += doc.getTextWidth(igContact) + spacing;

        doc.setTextColor(...lightColor);
        doc.text("|", currentX, footerY);
        doc.setTextColor(...primaryColor);
        currentX += doc.getTextWidth("|") + spacing;

        if (tiktokLogoImg) {
            const format = tiktokLogoImg.startsWith('/9j/') ? 'JPEG' : 'PNG';
            doc.addImage(tiktokLogoImg, format, currentX, footerY - 3, iconSize, iconSize, undefined, 'FAST');
            currentX += iconSize + 1;
        }
        doc.text(tiktokContact, currentX, footerY);

        // Page number
        doc.setFontSize(8);
        doc.text(`Página ${pageNumber}`, pageWidth - margins.right, footerY, { align: 'right' });
    };

    // 4. Generación de las tablas

    drawHeader('Esquema menú semanal');

    // To preserve rich text colors, we render a hidden HTML table and use html2canvas
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '1200px'; // Render wide for good resolution
    container.style.backgroundColor = '#ffffff';

    const brandLightHex = '#e3f6ed';
    const borderColor = '#cbd5e1';

    let htmlTable = `
    <div id="pdf-table-capture" style="padding: 10px; font-family: Helvetica, Arial, sans-serif; color: #3c3c3c; width: 1200px; box-sizing: border-box;">
      <table style="width: 100%; border-collapse: collapse; border: 1px solid ${borderColor};">
        <thead>
          <tr>
            <th style="padding: 12px; border: 1px solid ${borderColor}; background-color: ${brandLightHex}; width: 120px;"></th>
    `;
    MEALS.forEach(meal => {
        htmlTable += `<th style="padding: 12px; border: 1px solid ${borderColor}; background-color: ${brandLightHex}; text-align: center; color: #3c3c3c;">${meal}</th>`;
    });
    htmlTable += `</tr></thead><tbody>`;

    DAYS.forEach(day => {
        htmlTable += `<tr>
            <td style="padding: 12px; border: 1px solid ${borderColor}; background-color: ${brandLightHex}; font-weight: bold; text-align: center; color: #3c3c3c;">${day}</td>`;
        MEALS.forEach(meal => {
            const cellHtml = schemaMatrix[`${day}_${meal}`] || '';
            // center text both horizontally and vertically
            htmlTable += `<td style="padding: 12px; border: 1px solid ${borderColor}; text-align: center; vertical-align: middle; font-size: 14px; line-height: 1.5;">${cellHtml}</td>`;
        });
        htmlTable += `</tr>`;
    });
    htmlTable += `</tbody></table></div>`;

    container.innerHTML = htmlTable;
    document.body.appendChild(container);

    // Capture the HTML
    const captureEl = document.getElementById('pdf-table-capture');
    const canvas = await html2canvas(captureEl, { scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL('image/png');

    // Clean up DOM
    document.body.removeChild(container);

    // Fit table to PDF width (margin to margin)
    const availableWidth = pageWidth - margins.left - margins.right;
    const imgProps = doc.getImageProperties(imgData);
    const pdfHeightForTable = (imgProps.height * availableWidth) / imgProps.width;

    doc.addImage(imgData, 'PNG', margins.left, yPos, availableWidth, pdfHeightForTable, undefined, 'FAST');

    drawFooter(currentPage);

    // Force page break for second table
    doc.addPage();
    currentPage++;
    const secondHeaderTitle = patient && patient.first_name ? `Plan nutricional ${patient.first_name}` : 'Plan nutricional';
    drawHeader(secondHeaderTitle);
    yPos = 35;

    // Tabla 2: PLAN NUTRICIONAL (Vacía)
    const table2Body = DAYS.map(day => [day, '', '', '', '', '']);

    doc.autoTable({
        startY: yPos,
        head: [['Día de la\nsemana', ...MEALS]],
        body: table2Body,
        theme: 'grid',
        headStyles: {
            fillColor: brandLight, // Misma cabecera verde que en la hoja 1
            textColor: textColor,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            lineColor: [200, 200, 200],
            lineWidth: 0.1
        },
        bodyStyles: {
            fontSize: 10,
            textColor: textColor,
            halign: 'center',
            valign: 'middle',
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
            minCellHeight: 20 // Celdas mucho más altas para escribir al estar en apaisado
        },
        columnStyles: {
            0: {
                fontStyle: 'bold',
                fillColor: brandLight, // Días en verde claro como en la hoja 1
                halign: 'center', // Centrado igual que en la primera tabla
                cellWidth: 25
            }
        },
        margin: { left: margins.left, right: margins.right }
    });

    drawFooter(currentPage);

    // Guardar el PDF
    doc.save(`Esquema_Semanal.pdf`);
};
