import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function getOptName(opt) {
    if (opt?.custom_recipe_data?.name) return opt.custom_recipe_data.name;
    if (opt?.recipes?.name) return opt.recipes.name;
    return opt?.free_text || '—';
}

function getOptDescription(opt) {
    if (opt?.custom_recipe_data?.description) return opt.custom_recipe_data.description;
    if (opt?.recipes?.description) return opt.recipes.description;
    return null;
}

function getOptIngredients(opt) {
    if (opt?.custom_recipe_data?.ingredients) {
        return opt.custom_recipe_data.ingredients.map(ing => {
            const qty = ing.quantity_grams ? `${ing.quantity_grams}g de ` : '';
            return `• ${qty}${ing.food_name || 'Alimento'}`;
        });
    }
    if (opt?.recipes?.recipe_ingredients) {
        return opt.recipes.recipe_ingredients.map(ri => {
            const foodName = ri.foods?.name || ri.food?.name || 'Alimento';
            const qty = ri.quantity_grams ? `${ri.quantity_grams}g de ` : '';
            return `• ${qty}${foodName}`;
        });
    }
    return [];
}

function aggregateIngredients(items) {
    const list = {};
    items.forEach(opt => {
        let ingArr = [];
        if (opt?.custom_recipe_data?.ingredients) {
            ingArr = opt.custom_recipe_data.ingredients.map(ing => ({
                name: ing.food_name || 'Alimento',
                qty: parseFloat(ing.quantity_grams) || 0
            }));
        } else if (opt?.recipes?.recipe_ingredients) {
            ingArr = opt.recipes.recipe_ingredients.map(ri => ({
                name: ri.foods?.name || ri.food?.name || 'Alimento',
                qty: parseFloat(ri.quantity_grams) || 0
            }));
        }

        ingArr.forEach(ing => {
            if (!list[ing.name]) list[ing.name] = 0;
            list[ing.name] += ing.qty;
        });
    });

    return Object.entries(list)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, qty]) => ({ name, qty }));
}

// Helper for Hex to RGB
function hexToRgb(hex) {
    if (!hex) return null;
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
    }
    return [r, g, b];
}

export const generatePlanPdf = async (plan, items, nutritionist, patient) => {
    const loadImageAsBase64 = async (url) => {
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const blob = await response.blob();
            if (!blob.type.startsWith('image/')) return null;
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const dataUrl = reader.result;
                    const base64 = dataUrl.split(',')[1];
                    resolve(base64);
                };
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error(`Error loading image ${url}:`, e);
            return null;
        }
    };

    const doc = new jsPDF('p', 'mm', 'a4');
    const coverPages = new Set();

    const brandColor = [40, 72, 58]; // #28483a
    const brandLight = [227, 246, 237]; // #e3f6ed
    const secondaryColor = [208, 154, 132]; // #d09a84
    const textColor = [51, 65, 85];
    const lightColor = [100, 116, 139];
    const margins = { top: 20, left: 15, right: 15, bottom: 20 };

    const primaryColor = nutritionist?.pdf_color ? hexToRgb(nutritionist.pdf_color) : brandColor;

    const logoImg = await loadImageAsBase64('/covers/logo rosa.png');
    const mailLogoImg = await loadImageAsBase64('/covers/logo gmail.png');
    const igLogoImg = await loadImageAsBase64('/covers/logo instagram.png');
    const tiktokLogoImg = await loadImageAsBase64('/covers/logo tiktok.png');

    let yPos = 30;

    const drawHeader = (sectionName = '') => {
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 20, 'F');

        if (logoImg) {
            const format = logoImg.startsWith('/9j/') ? 'JPEG' : 'PNG';
            doc.addImage(logoImg, format, margins.left, 2, 16, 16, undefined, 'FAST');
        }

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        if (sectionName) {
            const sectionWidth = doc.getTextWidth(sectionName);
            doc.text(sectionName, (210 - sectionWidth) / 2, 13);
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const planText = `Plan nutricional personalizado para`;
        const patientName = `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim();
        doc.text(planText, 210 - margins.right, 9, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(patientName, 210 - margins.right, 14, { align: 'right' });
    };

    const drawFooter = (pageNumber) => {
        doc.setPage(pageNumber);
        const footerY = 297 - 10;
        doc.setTextColor(...primaryColor);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');

        doc.text("633 67 45 63", margins.left, footerY);

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

        let currentX = (210 - totalWidth) / 2;

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

        doc.setFontSize(8);
        doc.text(`Página ${pageNumber}`, 210 - margins.right, footerY, { align: 'right' });
    };

    const checkPageBreak = (currentY, neededHeight, sectionName = '') => {
        if (currentY + neededHeight > 275) {
            doc.addPage();
            drawHeader(sectionName);
            yPos = 35;
        }
    };

    // ----- COVER ----- //
    const portadaImg = await loadImageAsBase64('/covers/Portada.png');
    if (portadaImg) {
        doc.addImage(portadaImg, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
        coverPages.add(doc.internal.getNumberOfPages());
        doc.addPage();
    }

    // ----- INDICATIONS ----- //
    if (plan.indications && plan.indications.trim()) {
        const recCoverImg = await loadImageAsBase64('/covers/Portada recetario.png');
        if (recCoverImg) {
            doc.addImage(recCoverImg, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
            coverPages.add(doc.internal.getNumberOfPages());
            doc.addPage();
        }
        drawHeader('Indicaciones');
        doc.setTextColor(...textColor);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Indicaciones del Plan', margins.left, 30);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(plan.indications, 210 - margins.left - margins.right);
        doc.text(lines, margins.left, 42);
        doc.addPage();
    }

    const mealNames = plan.meal_names || [];
    const isClosedPlan = items.some(i => i.day_of_week !== null);
    yPos = 30;

    // --- SUMMARY / GRID ---
    if (isClosedPlan) {
        doc.addPage('a4', 'l');

        let schemaPageNum = doc.internal.getNumberOfPages();

        const schemaHeader = patient && patient.first_name ? `Esquema Semanal ${patient.first_name}` : 'Esquema Semanal';
        // Need to replicate drawHeader for landscape (pageWidth = 297)
        const schemaPageWidth = 297;

        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, schemaPageWidth, 20, 'F');

        if (logoImg) {
            const format = logoImg.startsWith('/9j/') ? 'JPEG' : 'PNG';
            doc.addImage(logoImg, format, margins.left, 2, 16, 16, undefined, 'FAST');
        }

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const sectionWidth = doc.getTextWidth(schemaHeader);
        doc.text(schemaHeader, (schemaPageWidth - sectionWidth) / 2, 13);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const planText = `Plan nutricional personalizado para`;
        const patientName = `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim();
        doc.text(planText, schemaPageWidth - margins.right, 9, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(patientName, schemaPageWidth - margins.right, 14, { align: 'right' });

        yPos = 35;


        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '1200px';
        container.style.backgroundColor = '#ffffff';

        const brandLightHex = '#e3f6ed';
        const borderColor = '#cbd5e1';

        let htmlTable = `
        <div id="pdf-table-capture" style="padding: 10px; font-family: Helvetica, Arial, sans-serif; color: #3c3c3c; width: 1200px; box-sizing: border-box;">
          <table style="width: 100%; border-collapse: collapse; border: 1px solid ${borderColor};">
            <thead>
              <tr>
                <th style="padding: 12px; border: 1px solid ${borderColor}; background-color: ${brandLightHex}; width: 120px;">Día</th>
        `;
        mealNames.forEach(meal => {
            htmlTable += `<th style="padding: 12px; border: 1px solid ${borderColor}; background-color: ${brandLightHex}; text-align: center; color: #3c3c3c;">${meal}</th>`;
        });
        htmlTable += `</tr></thead><tbody>`;

        DAYS.forEach((day, d) => {
            htmlTable += `<tr>
                <td style="padding: 12px; border: 1px solid ${borderColor}; background-color: ${brandLightHex}; font-weight: bold; text-align: center; color: #3c3c3c;">${day}</td>`;
            mealNames.forEach(meal => {
                const opt = items.find(i => i.meal_name === meal && i.day_of_week === (d + 1));
                const cellHtml = opt ? getOptName(opt) : '—';
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
        const availableWidth = schemaPageWidth - margins.left - margins.right;
        const imgProps = doc.getImageProperties(imgData);
        const pdfHeightForTable = (imgProps.height * availableWidth) / imgProps.width;

        doc.addImage(imgData, 'PNG', margins.left, yPos, availableWidth, pdfHeightForTable, undefined, 'FAST');

        // draw schema footer (landscape)
        const footerY = 210 - 10;
        doc.setTextColor(...primaryColor);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');

        doc.text("633 67 45 63", margins.left, footerY);

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

        let currentX = (schemaPageWidth - totalWidth) / 2;

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

        doc.setFontSize(8);
        // dont count in the general pages logic
        coverPages.add(schemaPageNum);

        doc.addPage('a4', 'p');
        yPos = 30;

        drawHeader('Resumen de Opciones');
        doc.setTextColor(...textColor);
        doc.setFontSize(10);
        checkPageBreak(yPos, 20);
        doc.setFillColor(...brandLight);
        doc.rect(margins.left, yPos, 180, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text("Resumen Diario", margins.left + 3, yPos + 5.5);
        yPos += 16;

        for (let d = 0; d < DAYS.length; d++) {
            const dayName = DAYS[d];
            const dayIndex = d + 1;
            const dayItems = items.filter(i => i.day_of_week === dayIndex).sort((a, b) => {
                const idxA = mealNames.indexOf(a.meal_name);
                const idxB = mealNames.indexOf(b.meal_name);
                return (idxA > -1 ? idxA : 99) - (idxB > -1 ? idxB : 99);
            });

            if (dayItems.length === 0) continue;

            checkPageBreak(yPos, 25);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...secondaryColor);
            doc.text(dayName, margins.left, yPos);
            yPos += 6;

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...textColor);

            dayItems.forEach(opt => {
                const n = getOptName(opt);

                checkPageBreak(yPos, 10);

                // Meal name in secondaryColor (pink)
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...secondaryColor);
                doc.text(opt.meal_name, margins.left + 5, yPos);
                yPos += 5;

                // Recipe name regular
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...textColor);

                const lines = doc.splitTextToSize(`• ${n}`, 175);
                checkPageBreak(yPos, lines.length * 5);
                doc.text(lines, margins.left + 5, yPos);

                yPos += lines.length * 5 + 2;
            });
            yPos += 6;
        }
    } else {
        drawHeader('Resumen de Opciones');
        doc.setTextColor(...textColor);
        doc.setFontSize(10);
        checkPageBreak(yPos, 20);
        doc.setFillColor(...brandLight);
        doc.rect(margins.left, yPos, 180, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text("Resumen de Opciones", margins.left + 3, yPos + 5.5);
        yPos += 16;

        mealNames.forEach(meal => {
            const mealItems = [];
            const seen = new Set();
            items.filter(i => i.meal_name === meal).forEach(i => {
                const n = getOptName(i);
                if (!seen.has(n)) { seen.add(n); mealItems.push(i); }
            });
            if (mealItems.length === 0) return;

            checkPageBreak(yPos, 15);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...secondaryColor);
            doc.text(meal, margins.left, yPos);
            yPos += 5;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...textColor);
            mealItems.forEach(opt => {
                const lines = doc.splitTextToSize(`• ${getOptName(opt)}`, 175);
                checkPageBreak(yPos, lines.length * 4.5);
                doc.text(lines, margins.left + 5, yPos);
                yPos += lines.length * 4.5;
            });
            yPos += 4;
        });
    }

    // --- DETAILS ---
    if (isClosedPlan) {
        for (let d = 0; d < DAYS.length; d++) {
            const dayName = DAYS[d];
            const dayIndex = d + 1;

            const dayItems = items.filter(i => i.day_of_week === dayIndex).sort((a, b) => {
                const idxA = mealNames.indexOf(a.meal_name);
                const idxB = mealNames.indexOf(b.meal_name);
                return (idxA > -1 ? idxA : 99) - (idxB > -1 ? idxB : 99);
            });

            if (dayItems.length === 0) continue;

            let coverName = dayName;
            if (dayName === 'Miércoles') coverName = 'Miercoles';

            const cover = await loadImageAsBase64(`/covers/${coverName}.png`);
            if (cover) {
                if (yPos > 30) doc.addPage();
                doc.addImage(cover, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
                coverPages.add(doc.internal.getNumberOfPages());
                doc.addPage();
                drawHeader(dayName);
                yPos = 35;
            } else {
                checkPageBreak(yPos, 20, dayName);
            }

            dayItems.forEach(opt => {
                const recipeName = getOptName(opt);
                const titleText = `${opt.meal_name}: ${recipeName}`;
                const desc = getOptDescription(opt);
                const ings = getOptIngredients(opt);
                const lines = doc.splitTextToSize(titleText, 174);
                const boxH = (lines.length * 4) + 2;

                let leftH = 0;
                ings.forEach(ing => { leftH += (doc.splitTextToSize(ing, 85).length * 4.5); });
                let rightH = (desc ? doc.splitTextToSize(desc, 85).length * 4.4 : 0);

                checkPageBreak(yPos, boxH + Math.max(leftH, rightH) + 10);

                doc.setFillColor(...brandLight);
                doc.rect(margins.left, yPos - 3, 180, boxH, 'F');
                doc.setTextColor(...primaryColor);
                doc.setFont('helvetica', 'bold');
                doc.text(lines, 105, yPos + (boxH / 2) - 3, { align: 'center' });

                yPos += boxH + 2;
                let lY = yPos, rY = yPos;
                doc.setTextColor(...textColor);
                doc.setFontSize(9);
                ings.forEach(ing => {
                    const il = doc.splitTextToSize(ing, 85);
                    doc.text(il, margins.left + 2, lY);
                    lY += il.length * 4.5;
                });
                if (desc) {
                    doc.setTextColor(...lightColor);
                    const dl = doc.splitTextToSize(desc, 85);
                    doc.text(dl, margins.left + 95, rY);
                    rY += dl.length * 4.4;
                }
                yPos = Math.max(lY, rY) + 5;
            });
        }
    } else {
        for (const meal of mealNames) {
            const mealItems = [];
            const seen = new Set();
            items.filter(i => i.meal_name === meal).forEach(i => {
                const n = getOptName(i);
                if (!seen.has(n)) { seen.add(n); mealItems.push(i); }
            });
            if (mealItems.length === 0) continue;

            const expected = meal.toLowerCase().includes('desayun') ? 'Desayuno' :
                meal.toLowerCase().includes('almuerz') ? 'Almuerzo' :
                    meal.toLowerCase().includes('comid') ? 'Almuerzo' :
                        meal.toLowerCase().includes('meriend') ? 'Merienda' :
                            meal.toLowerCase().includes('cen') ? 'Cena' : meal;

            const plural = expected === 'Desayuno' ? 'Desayunos' :
                expected === 'Almuerzo' ? 'Almuerzos' :
                    expected === 'Merienda' ? 'Meriendas' :
                        expected === 'Cena' ? 'Cenas' : meal;

            const cover = await loadImageAsBase64(`/covers/${expected}.png`);
            if (cover) {
                if (yPos > 30) doc.addPage();
                doc.addImage(cover, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
                coverPages.add(doc.internal.getNumberOfPages());
                doc.addPage();
                drawHeader(plural);
                yPos = 35;
            } else {
                checkPageBreak(yPos, 20, plural);
            }

            mealItems.forEach(opt => {
                const name = getOptName(opt);
                const desc = getOptDescription(opt);
                const ings = getOptIngredients(opt);
                const lines = doc.splitTextToSize(name, 174);
                const boxH = (lines.length * 4) + 2;

                let leftH = 0;
                ings.forEach(ing => { leftH += (doc.splitTextToSize(ing, 85).length * 4.5); });
                let rightH = (desc ? doc.splitTextToSize(desc, 85).length * 4.4 : 0);

                checkPageBreak(yPos, boxH + Math.max(leftH, rightH) + 10);

                doc.setFillColor(...brandLight);
                doc.rect(margins.left, yPos - 3, 180, boxH, 'F');
                doc.setTextColor(...primaryColor);
                doc.setFont('helvetica', 'bold');
                doc.text(lines, 105, yPos + (boxH / 2) - 3, { align: 'center' });

                yPos += boxH + 2;
                let lY = yPos, rY = yPos;
                doc.setTextColor(...textColor);
                doc.setFontSize(9);
                ings.forEach(ing => {
                    const il = doc.splitTextToSize(ing, 85);
                    doc.text(il, margins.left + 2, lY);
                    lY += il.length * 4.5;
                });
                if (desc) {
                    doc.setTextColor(...lightColor);
                    const dl = doc.splitTextToSize(desc, 85);
                    doc.text(dl, margins.left + 95, rY);
                    rY += dl.length * 4.4;
                }
                yPos = Math.max(lY, rY) + 5;
            });
        }
    }

    // --- SHOPPING LIST ---
    if (isClosedPlan) {
        const shopping = aggregateIngredients(items);
        if (shopping.length > 0) {
            doc.addPage();
            drawHeader('Lista de la Compra Semanal');
            yPos = 35;
            doc.setFillColor(...brandLight);
            doc.rect(margins.left, yPos, 180, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...primaryColor);
            doc.text("Lista de la Compra Semanal", margins.left + 3, yPos + 5.5);
            yPos += 12;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...textColor);
            let currentX = margins.left + 5;
            shopping.forEach(item => {
                if (currentX === margins.left + 5) checkPageBreak(yPos, 6);
                const txt = `• ${item.qty > 0 ? Math.round(item.qty) + 'g - ' : ''}${item.name}`;
                doc.text(txt.substring(0, 45), currentX, yPos);
                if (currentX === margins.left + 5) { currentX = margins.left + 95; }
                else { currentX = margins.left + 5; yPos += 6; }
            });
        }
    }

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        if (!coverPages.has(i)) drawFooter(i);
    }

    doc.save(`Plan_${plan.name.replace(/\s+/g, '_')}_${patient?.first_name || 'Paciente'}.pdf`);
};
