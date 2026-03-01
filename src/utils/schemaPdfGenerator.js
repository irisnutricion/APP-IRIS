import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateSchemaPdf = async (nutritionist) => {
    // 1. Configuración inicial
    const doc = new jsPDF('l', 'mm', 'a4'); // 'l' for landscape
    let currentPage = 1;
    let yPos = 20;

    // Colores corporativos (coherentes con planPdfGenerator)
    const primaryColor = [157, 185, 143]; // #9db98f
    const brandLight = [224, 237, 217];   // #e0edd9
    const secondaryColor = [220, 224, 219];
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
            doc.addImage(logoImg, 'PNG', margins.left, 5, 20, 20, undefined, 'FAST');
        }

        // Título del documento
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

        // Línea separadora pie
        doc.setDrawColor(...secondaryColor);
        doc.setLineWidth(0.5);
        doc.line(margins.left, footerY - 5, pageWidth - margins.right, footerY - 5);

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
            doc.addImage(mailLogoImg, 'PNG', currentX, footerY - 3, iconSize, iconSize, undefined, 'FAST');
            currentX += iconSize + 1;
        }
        doc.text(emailContact, currentX, footerY);
        currentX += doc.getTextWidth(emailContact) + spacing;

        doc.setTextColor(...lightColor);
        doc.text("|", currentX, footerY);
        doc.setTextColor(...primaryColor);
        currentX += doc.getTextWidth("|") + spacing;

        if (igLogoImg) {
            doc.addImage(igLogoImg, 'PNG', currentX, footerY - 3, iconSize, iconSize, undefined, 'FAST');
            currentX += iconSize + 1;
        }
        doc.text(igContact, currentX, footerY);
        currentX += doc.getTextWidth(igContact) + spacing;

        doc.setTextColor(...lightColor);
        doc.text("|", currentX, footerY);
        doc.setTextColor(...primaryColor);
        currentX += doc.getTextWidth("|") + spacing;

        if (tiktokLogoImg) {
            doc.addImage(tiktokLogoImg, 'PNG', currentX, footerY - 3, iconSize, iconSize, undefined, 'FAST');
            currentX += iconSize + 1;
        }
        doc.text(tiktokContact, currentX, footerY);

        // Page number
        doc.setFontSize(8);
        doc.text(`Página ${pageNumber}`, pageWidth - margins.right, footerY, { align: 'right' });
    };

    // 4. Generación de las tablas

    drawHeader('Esquema Semanal Genérico');

    // Tabla 1: ESQUEMA MENÚ SEMANAL (Rellena con la configuración)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('ESQUEMA MENÚ SEMANAL', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;

    const table1Body = DAYS.map(day => {
        const row = [day];
        MEALS.forEach(meal => {
            row.push(schemaMatrix[`${day}_${meal}`] || '');
        });
        return row;
    });

    doc.autoTable({
        startY: yPos,
        head: [['', ...MEALS]],
        body: table1Body,
        theme: 'grid',
        headStyles: {
            fillColor: brandLight,
            textColor: textColor,
            fontStyle: 'bold',
            halign: 'center',
            lineColor: [200, 200, 200],
            lineWidth: 0.1
        },
        bodyStyles: {
            fontSize: 9, // Slightly larger base font since it's landscape
            textColor: textColor,
            halign: 'center',
            valign: 'middle',
            lineColor: [200, 200, 200],
            lineWidth: 0.1
        },
        columnStyles: {
            0: { // Columna de Días
                fontStyle: 'bold',
                fillColor: brandLight,
                halign: 'center',
                cellWidth: 25 // Slightly wider to accommodate larger font
            }
        },
        margin: { left: margins.left, right: margins.right }
    });

    drawFooter(currentPage);

    // Force page break for second table
    doc.addPage();
    currentPage++;
    drawHeader('Plan Nutricional Vacío');
    yPos = 35;

    // Tabla 2: PLAN NUTRICIONAL (Vacía)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Plan nutricional', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;

    const table2Body = DAYS.map(day => [day, '', '', '', '', '']);

    doc.autoTable({
        startY: yPos,
        head: [['Día de la\nsemana', ...MEALS]],
        body: table2Body,
        theme: 'grid',
        headStyles: {
            fillColor: [255, 255, 255], // Blanco en la tabla vacía
            textColor: textColor,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            lineColor: [100, 100, 100],
            lineWidth: 0.2
        },
        bodyStyles: {
            fontSize: 10,
            textColor: textColor,
            halign: 'center',
            valign: 'middle',
            lineColor: [100, 100, 100],
            lineWidth: 0.2,
            minCellHeight: 20 // Celdas mucho más altas para escribir al estar en apaisado
        },
        columnStyles: {
            0: {
                fontStyle: 'bold',
                fillColor: brandLight, // Días en verde claro como en la imagen
                halign: 'left',
                cellWidth: 25
            }
        },
        margin: { left: margins.left, right: margins.right }
    });

    drawFooter(currentPage);

    // Guardar el PDF
    doc.save(`Esquema_Semanal.pdf`);
};
