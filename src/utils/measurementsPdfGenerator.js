import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

/**
 * Generates a PDF report with patient measurements, including charts and a data table
 * @param {Object} patient - Patient object with measurements and personal info
 * @param {Object} chartRefs - Object containing refs to chart canvas elements
 * @param {Array} selectedCharts - Array of chart keys to include (e.g. ['weight', 'pecho'])
 */
export const generateMeasurementsPDF = async (patient, chartRefs = {}, selectedCharts = null) => {
    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const primaryColor = [40, 72, 58]; // Verde #28483a
    const lightGreen = [230, 240, 235];
    const darkGray = [60, 60, 60];

    let yPosition = 20;

    // Helper function to add page numbers
    const addPageNumber = () => {
        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`Página ${i} de ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
        }
    };

    // === PAGE 1: Header & Patient Info ===

    // Title
    pdf.setFontSize(24);
    pdf.setTextColor(...primaryColor);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Informe de Mediciones', pageWidth / 2, 25, { align: 'center' });

    // Separator line (drawn BEFORE logo so logo appears on top)
    pdf.setDrawColor(...primaryColor);
    pdf.setLineWidth(0.5);
    pdf.line(15, 35, pageWidth - 15, 35);

    // Add logo (drawn AFTER line so it appears on top of it)
    try {
        const logoImg = new Image();
        logoImg.src = '/logo-rosa.png';
        await new Promise((resolve, reject) => {
            logoImg.onload = resolve;
            logoImg.onerror = reject;
        });
        pdf.addImage(logoImg, 'PNG', 15, 10, 30, 30);
    } catch (error) {
        console.warn('Logo could not be loaded:', error);
    }

    yPosition = 50;

    // Patient information - inline labels with values
    pdf.setFontSize(12);
    pdf.setTextColor(...darkGray);

    pdf.setFont('helvetica', 'bold');
    const clienteLabel = 'Cliente: ';
    pdf.text(clienteLabel, 15, yPosition);
    const clienteLabelWidth = pdf.getTextWidth(clienteLabel);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${patient.first_name} ${patient.last_name}`, 15 + clienteLabelWidth, yPosition);

    yPosition += 8;
    pdf.setFont('helvetica', 'bold');
    const fechaLabel = 'Fecha del informe: ';
    pdf.text(fechaLabel, 15, yPosition);
    const fechaLabelWidth = pdf.getTextWidth(fechaLabel);
    pdf.setFont('helvetica', 'normal');
    const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    pdf.text(today, 15 + fechaLabelWidth, yPosition);

    // Measurement period
    if (patient.measurements && patient.measurements.length > 0) {
        const sortedMeasurements = [...patient.measurements].sort((a, b) => new Date(a.date) - new Date(b.date));
        const firstDate = new Date(sortedMeasurements[0].date).toLocaleDateString('es-ES');
        const lastDate = new Date(sortedMeasurements[sortedMeasurements.length - 1].date).toLocaleDateString('es-ES');

        yPosition += 8;
        pdf.setFont('helvetica', 'bold');
        const periodoLabel = 'Período: ';
        pdf.text(periodoLabel, 15, yPosition);
        const periodoLabelWidth = pdf.getTextWidth(periodoLabel);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${firstDate} - ${lastDate}`, 15 + periodoLabelWidth, yPosition);
    }

    yPosition += 15;

    // === EVOLUTION SUMMARY (First vs Last Recorded) ===
    if (patient.measurements && patient.measurements.length >= 2) {
        const sorted = [...patient.measurements].sort((a, b) => new Date(a.date) - new Date(b.date));

        pdf.setFontSize(16);
        pdf.setTextColor(...primaryColor);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Resumen de Evolución', 15, yPosition);
        yPosition += 3;

        const metricsConfig = [
            { key: 'weight', label: 'Peso (kg)' },
            { key: 'pecho', label: 'Pecho (cm)' },
            { key: 'cadera', label: 'Cadera (cm)' },
            { key: 'sobre_ombligo', label: 'Abd. Sobre Ombligo' },
            { key: 'ombligo', label: 'Abd. Ombligo' },
            { key: 'bajo_ombligo', label: 'Abd. Bajo Ombligo' },
            { key: 'brazo_izq', label: 'Brazo Izq. (cm)' },
            { key: 'brazo_der', label: 'Brazo Der. (cm)' },
            { key: 'muslo_izq', label: 'Muslo Izq. (cm)' },
            { key: 'muslo_der', label: 'Muslo Der. (cm)' },
        ];

        const summaryData = metricsConfig.map(metric => {
            // Get all non-null values for this metric
            const validMeasurements = sorted.filter(m =>
                m[metric.key] !== null &&
                m[metric.key] !== undefined &&
                m[metric.key] !== '' &&
                !isNaN(parseFloat(m[metric.key]))
            );

            if (validMeasurements.length < 2) return null; // Need at least 2 points for diff

            const first = validMeasurements[0];
            const last = validMeasurements[validMeasurements.length - 1];

            const fv = parseFloat(first[metric.key]);
            const lv = parseFloat(last[metric.key]);

            const diff = lv - fv;
            const diffStr = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);

            return [
                metric.label,
                fv.toFixed(1),
                lv.toFixed(1),
                diffStr
            ];
        }).filter(row => row !== null);

        if (summaryData.length > 0) {
            autoTable(pdf, {
                startY: yPosition,
                head: [['Medida', 'Valor Inicial', 'Valor Actual', 'Diferencia']],
                body: summaryData,
                theme: 'striped',
                headStyles: {
                    fillColor: primaryColor,
                    textColor: [255, 255, 255],
                    fontSize: 9,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                bodyStyles: {
                    fontSize: 9,
                    textColor: darkGray,
                    halign: 'center'
                },
                columnStyles: {
                    0: { halign: 'left', fontStyle: 'bold' },
                    3: { fontStyle: 'bold' }
                },
                alternateRowStyles: {
                    fillColor: [250, 250, 250]
                },
                margin: { left: 15, right: 15 },
                didParseCell: (data) => {
                    // Color-code the difference column
                    if (data.column.index === 3 && data.section === 'body') {
                        const val = parseFloat(data.cell.raw);
                        if (!isNaN(val)) {
                            if (val < 0) {
                                data.cell.styles.textColor = [22, 163, 74]; // green for loss
                            } else if (val > 0) {
                                data.cell.styles.textColor = [220, 38, 38]; // red for gain
                            }
                        }
                    }
                }
            });

            yPosition = pdf.lastAutoTable.finalY + 10;
        }
    }

    // === EVOLUTION CHARTS ===

    // All available charts
    const allCharts = [
        { key: 'weight', title: 'Peso (kg)' },
        { key: 'pecho', title: 'Pecho (cm)' },
        { key: 'cadera', title: 'Cadera (cm)' },
        { key: 'sobre_ombligo', title: 'Abd. Sobre Ombligo (cm)' },
        { key: 'ombligo', title: 'Abd. Ombligo (cm)' },
        { key: 'bajo_ombligo', title: 'Abd. Bajo Ombligo (cm)' },
        { key: 'brazo_izq', title: 'Brazo Izquierdo (cm)' },
        { key: 'brazo_der', title: 'Brazo Derecho (cm)' },
        { key: 'muslo_izq', title: 'Muslo Izquierdo (cm)' },
        { key: 'muslo_der', title: 'Muslo Derecho (cm)' }
    ];

    // Filter by selected charts
    const chartsToInclude = selectedCharts
        ? allCharts.filter(c => selectedCharts.includes(c.key))
        : allCharts;

    if (chartsToInclude.length > 0) {
        // Check if we need a new page (if summary table took up space)
        if (yPosition > pageHeight - 80) {
            pdf.addPage();
            yPosition = 20;
        }

        pdf.setFontSize(16);
        pdf.setTextColor(...primaryColor);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Evolución de Mediciones', 15, yPosition);

        yPosition += 10;

        // Chart configuration
        const chartWidth = 85;
        const chartHeight = 60;
        const chartSpacing = 10;
        const chartsPerRow = 2;

        let chartIndex = 0;

        for (const chartInfo of chartsToInclude) {
            const chartRef = chartRefs[chartInfo.key];

            if (!chartRef || !chartRef.current) {
                console.warn(`Chart ref for ${chartInfo.key} not found`);
                continue;
            }

            try {
                const chartInstance = chartRef.current;
                const canvas = chartInstance?.canvas;

                if (!canvas) {
                    console.warn(`Canvas for ${chartInfo.key} not found`);
                    continue;
                }

                const col = chartIndex % chartsPerRow;
                const row = Math.floor(chartIndex / chartsPerRow);

                const xPos = 15 + col * (chartWidth + chartSpacing);
                let chartYPos = yPosition + row * (chartHeight + chartSpacing + 5);

                if (chartYPos + chartHeight > pageHeight - 20) {
                    pdf.addPage();
                    yPosition = 20;
                    chartYPos = yPosition;
                    chartIndex = 0;
                }

                // Create a temporary canvas to add white background
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext('2d');

                // Fill with white background
                tempCtx.fillStyle = '#ffffff';
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

                // Draw the original chart on top
                tempCtx.drawImage(canvas, 0, 0);

                // Get JPEG from temp canvas
                const chartImgData = tempCanvas.toDataURL('image/jpeg', 0.8);

                pdf.setFontSize(10);
                pdf.setTextColor(...darkGray);
                pdf.setFont('helvetica', 'bold');
                pdf.text(chartInfo.title, xPos, chartYPos);

                pdf.addImage(chartImgData, 'JPEG', xPos, chartYPos + 3, chartWidth, chartHeight);

                chartIndex++;

            } catch (error) {
                console.error(`Error capturing chart ${chartInfo.key}:`, error);
            }
        }
    }

    // === MEASUREMENTS TABLE ===

    // Add new page for table
    pdf.addPage();
    yPosition = 20;

    pdf.setFontSize(16);
    pdf.setTextColor(...primaryColor);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Historial Completo de Mediciones', 15, yPosition);

    yPosition += 10;

    // Prepare table data
    const tableData = [...patient.measurements]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(m => [
            new Date(m.date).toLocaleDateString('es-ES'),
            m.weight ? `${m.weight} kg` : '-',
            m.pecho || '-',
            m.cadera || '-',
            `${m.sobre_ombligo || '-'} | ${m.ombligo || '-'} | ${m.bajo_ombligo || '-'}`,
            `${m.brazo_izq || '-'} | ${m.brazo_der || '-'}`,
            `${m.muslo_izq || '-'} | ${m.muslo_der || '-'}`
        ]);

    autoTable(pdf, {
        startY: yPosition,
        head: [['Fecha', 'Peso', 'Pecho', 'Cadera', 'Abd (S|O|B)', 'Brazos (I|D)', 'Muslos (I|D)']],
        body: tableData,
        theme: 'striped',
        headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center'
        },
        bodyStyles: {
            fontSize: 8,
            textColor: darkGray,
            halign: 'center'
        },
        alternateRowStyles: {
            fillColor: [250, 250, 250]
        },
        margin: { left: 15, right: 15 },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold' }
        }
    });

    // Add page numbers
    addPageNumber();

    // Generate filename
    const fileName = `Mediciones_${patient.first_name}_${patient.last_name}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Save PDF
    pdf.save(fileName);
};
