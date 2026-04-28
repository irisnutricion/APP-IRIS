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
            return 35;
        }
        return currentY;
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
        drawHeader('Indicaciones');
        doc.setTextColor(...textColor);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Indicaciones del Plan', margins.left, 30);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(plan.indications, 210 - margins.left - margins.right);
        doc.text(lines, margins.left, 42);
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
            doc.setFontSize(14);
            doc.setTextColor(...primaryColor);
            doc.text(dayName.toUpperCase(), margins.left, yPos);
            yPos += 8;
            doc.setFontSize(10);

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
        if (plan.indications && plan.indications.trim()) {
            doc.addPage();
        }
        yPos = 30;
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

        for (const meal of mealNames) {
            const mealItems = [];
            const seen = new Set();
            items.filter(i => i.meal_name === meal).forEach(i => {
                const n = getOptName(i);
                if (!seen.has(n)) { seen.add(n); mealItems.push(i); }
            });
            if (mealItems.length === 0) continue;

            checkPageBreak(yPos, 15, 'Resumen de Opciones');
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...secondaryColor);  // reset after possible page break
            doc.text(meal, margins.left, yPos);
            yPos += 5;

            for (const opt of mealItems) {
                const lines = doc.splitTextToSize(`• ${getOptName(opt)}`, 175);
                checkPageBreak(yPos, lines.length * 4.5, 'Resumen de Opciones');
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...textColor);   // CRITICAL: reset after possible page break
                doc.text(lines, margins.left + 5, yPos);
                yPos += lines.length * 4.5;
            }
            yPos += 4;
        }
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
            if (dayName === 'Sábado') coverName = 'Sabado';

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
                const titleText = recipeName;
                const desc = getOptDescription(opt);
                const ings = getOptIngredients(opt);
                const lines = doc.splitTextToSize(titleText, 174);
                const boxH = (lines.length * 4) + 2;

                // Check if at least the meal label + title box fits
                checkPageBreak(yPos, boxH + 15, dayName);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(...secondaryColor);
                doc.text(opt.meal_name, margins.left, yPos);
                yPos += 5;

                doc.setFillColor(...brandLight);
                doc.rect(margins.left, yPos - 3, 180, boxH, 'F');
                doc.setTextColor(...primaryColor);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text(lines, 105, yPos + (boxH / 2) - 3, { align: 'center', baseline: 'middle' });

                yPos += boxH + 2;

                // Render ingredients and description with per-line page break checks
                const leftColX = margins.left + 2;
                const rightColX = margins.left + 95;
                const colWidth = 85;

                const ingLines = [];
                ings.forEach(ing => {
                    const il = doc.splitTextToSize(ing, colWidth);
                    il.forEach(l => ingLines.push(l));
                });

                const descLines = desc ? doc.splitTextToSize(desc, colWidth) : [];
                const maxLines = Math.max(ingLines.length, descLines.length);
                const lineH = 4.5;

                doc.setFontSize(9);
                for (let li = 0; li < maxLines; li++) {
                    if (yPos + lineH > 275) {
                        doc.addPage();
                        drawHeader(dayName);
                        yPos = 35;
                    }

                    if (li < ingLines.length) {
                        doc.setTextColor(...textColor);
                        doc.setFont('helvetica', 'normal');
                        doc.text(ingLines[li], leftColX, yPos);
                    }
                    if (li < descLines.length) {
                        doc.setTextColor(...lightColor);
                        doc.setFont('helvetica', 'normal');
                        doc.text(descLines[li], rightColX, yPos);
                    }
                    yPos += lineH;
                }

                yPos += 5;
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

            console.log(`[PDF] Meal: "${meal}", items: ${mealItems.length}, yPos: ${yPos}`);
            if (mealItems.length === 0) continue;

            const expected = meal.toLowerCase().includes('desayun') ? 'Desayuno' :
                meal.toLowerCase().includes('almuerz') ? 'Almuerzo' :
                    meal.toLowerCase().includes('comid') ? 'Comida' :
                        meal.toLowerCase().includes('meriend') ? 'Merienda' :
                            meal.toLowerCase().includes('cen') ? 'Cena' : meal;

            const plural = expected === 'Desayuno' ? 'Desayunos' :
                expected === 'Almuerzo' ? 'Almuerzos' :
                    expected === 'Comida' ? 'Comidas' :
                        expected === 'Merienda' ? 'Meriendas' :
                            expected === 'Cena' ? 'Cenas' : meal;

            const cover = await loadImageAsBase64(`/covers/${plural}.png`);
            console.log(`[PDF] Cover for "${plural}": ${cover ? 'loaded' : 'NOT FOUND'}, yPos before: ${yPos}`);

            // Always start each meal section on a fresh page
            doc.addPage();
            const contentPageNum = doc.internal.getNumberOfPages();
            console.log(`[PDF] Content page created: ${contentPageNum}`);

            if (cover) {
                // Insert the decorative cover BEFORE the content page
                // We need to go back and insert it, so instead we do: cover first, then content
                // Strategy: draw cover on current page, then add content page
                doc.addImage(cover, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
                coverPages.add(doc.internal.getNumberOfPages());
                doc.addPage();
            }

            drawHeader(plural);
            yPos = 35;
            console.log(`[PDF] yPos after header: ${yPos}, current page: ${doc.internal.getNumberOfPages()}`);

            for (const opt of mealItems) {
                const name = getOptName(opt);
                const desc = getOptDescription(opt);
                const ings = getOptIngredients(opt);
                const lines = doc.splitTextToSize(name, 174);
                const boxH = (lines.length * 4) + 2;

                console.log(`[PDF]   Recipe: "${name}", yPos: ${yPos}, boxH: ${boxH}`);

                // Ensure title box fits; create new page if needed
                if (yPos + boxH + 10 > 275) {
                    console.log(`[PDF]   PAGE BREAK before title, yPos was: ${yPos}`);
                    doc.addPage();
                    drawHeader(plural);
                    yPos = 35;
                }

                doc.setFillColor(brandLight[0], brandLight[1], brandLight[2]);
                doc.rect(margins.left, yPos - 3, 180, boxH, 'F');
                doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text(lines, 105, yPos + (boxH / 2) - 3, { align: 'center', baseline: 'middle' });
                yPos += boxH + 2;

                // Flatten all ingredient lines
                const leftColX = margins.left + 2;
                const rightColX = margins.left + 95;
                const colWidth = 85;
                const lineH = 4.5;

                const ingLines = [];
                for (const ing of ings) {
                    for (const l of doc.splitTextToSize(ing, colWidth)) {
                        ingLines.push(l);
                    }
                }
                const descLines = desc ? doc.splitTextToSize(desc, colWidth) : [];
                const maxLines = Math.max(ingLines.length, descLines.length);

                for (let li = 0; li < maxLines; li++) {
                    if (yPos + lineH > 275) {
                        console.log(`[PDF]   PAGE BREAK during ingredients li=${li}, yPos=${yPos}`);
                        doc.addPage();
                        drawHeader(plural);
                        yPos = 35;
                    }
                    if (li < ingLines.length) {
                        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(9);
                        doc.text(ingLines[li], leftColX, yPos);
                    }
                    if (li < descLines.length) {
                        doc.setTextColor(lightColor[0], lightColor[1], lightColor[2]);
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(9);
                        doc.text(descLines[li], rightColX, yPos);
                    }
                    yPos += lineH;
                }
                yPos += 5;
            }
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

    const dateToUse = plan?.created_at ? new Date(plan.created_at) : new Date();
    const dateStr = `${String(dateToUse.getDate()).padStart(2, '0')}-${String(dateToUse.getMonth() + 1).padStart(2, '0')}-${dateToUse.getFullYear()}`;
    const patientName = `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim() || 'Paciente';
    const fileName = `Plan nutricional ${patientName} ${dateStr}.pdf`;

    // Always download locally
    doc.save(fileName);

    // If patient has a Drive folder configured, send to n8n webhook to upload
    const driveFolderId = patient?.drive_folder_id;
    const n8nWebhookUrl = import.meta.env.VITE_N8N_DRIVE_WEBHOOK_URL;

    if (driveFolderId && n8nWebhookUrl) {
        try {
            const pdfBase64 = doc.output('datauristring').split(',')[1];
            const response = await fetch(n8nWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    folderId: driveFolderId,
                    fileName: fileName,
                    fileBase64: pdfBase64,
                    patientName: patientName,
                }),
            });
            if (!response.ok) {
                console.error('Error uploading plan to Drive via n8n:', response.statusText);
                return { success: true, driveUploaded: false, error: response.statusText };
            }
            return { success: true, driveUploaded: true };
        } catch (err) {
            console.error('Error calling n8n Drive webhook:', err);
            return { success: true, driveUploaded: false, error: err.message };
        }
    }

    return { success: true, driveUploaded: false };
};
