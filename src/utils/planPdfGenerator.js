import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { calcSnapshotMacros } from '../components/Plans/ClosedPlanEditor'; // We can borrow this

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

export const generatePlanPdf = async (plan, items, nutritionist, patient) => {
    const loadImageAsBase64 = async (url) => {
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const blob = await response.blob();
            if (!blob.type.startsWith('image/')) {
                console.warn(`URL ${url} returns non-image type: ${blob.type}`);
                return null;
            }
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

    // A4 sheet: 210 x 297 mm
    const doc = new jsPDF('p', 'mm', 'a4');
    const coverPages = new Set();

    const brandColor = [40, 72, 58]; // #28483a (Primary 700)
    const brandLight = [227, 246, 237]; // #e3f6ed (Primary 100)
    const secondaryColor = [208, 154, 132]; // #d09a84 (Secondary Default)
    const textColor = [51, 65, 85]; // Slate 700
    const lightColor = [100, 116, 139]; // Slate 500
    const margins = { top: 20, left: 15, right: 15, bottom: 20 };

    // Config: Primary theme color
    const primaryColor = nutritionist?.pdf_color ? hexToRgb(nutritionist.pdf_color) : brandColor;

    let currentPage = 1;
    const drawHeader = () => {
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 15, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        if (nutritionist?.clinic_name) {
            doc.text(nutritionist.clinic_name, margins.left, 10);
        } else if (nutritionist?.label) {
            doc.text(`Nutricionista: ${nutritionist.label}`, margins.left, 10);
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Plan: ${plan.name}`, 210 - margins.right, 10, { align: 'right' });
    };

    const drawFooter = () => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setPage(pageCount);
        doc.setTextColor(...lightColor);
        doc.setFontSize(8);
        const footerY = 297 - 10;
        doc.text(`Paciente: ${patient?.first_name} ${patient?.last_name || ''}`, margins.left, footerY);
        doc.text(`Página ${pageCount}`, 210 - margins.right, footerY, { align: 'right' });
    };

    // ----- PAGE 1: MAIN COVER ----- //
    const portadaImg = await loadImageAsBase64('/covers/Portada.png');
    if (portadaImg) {
        doc.addImage(portadaImg, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
        coverPages.add(doc.internal.getNumberOfPages());
        doc.addPage();
    }

    // ----- PAGE 2: INDICATIONS ----- //
    if (plan.indications && plan.indications.trim().length > 0) {
        // First try to load recommendations cover
        const recCoverImg = await loadImageAsBase64('/covers/Portada recetario.png');
        if (recCoverImg) {
            doc.addImage(recCoverImg, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
            coverPages.add(doc.internal.getNumberOfPages());
            doc.addPage();
        }

        drawHeader();

        doc.setTextColor(...textColor);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Indicaciones del Plan', margins.left, 30);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        // Split text to fit page width
        const maxWidth = 210 - margins.left - margins.right;
        const textLines = doc.splitTextToSize(plan.indications, maxWidth);

        doc.text(textLines, margins.left, 42);

        doc.addPage();
        currentPage++;
    }

    // ----- PLAN OPTIONS SUMMARY ----- //
    drawHeader();

    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Group items by day (Standard closed plan structure or Open Plan simulation)
    // To keep it simple, we do a day-by-day list or meal-by-meal list depending on plan type.

    // Open Plan: Group by meal
    const mealNames = plan.meal_names || [];

    // Assume items are attached to meals (if open plan, day_of_week is null. If closed, we group by day)
    const isClosedPlan = items.some(i => i.day_of_week !== null);

    let yPos = 30;

    if (isClosedPlan) {
        // Group by day 1..7
        DAYS.forEach((day, dayIdx) => {
            const dayNum = dayIdx + 1;
            const dayItems = items.filter(i => i.day_of_week === dayNum);

            if (dayItems.length === 0) return;

            // Subheader: Day
            doc.setFillColor(...brandLight);
            doc.rect(margins.left, yPos, 210 - margins.left - margins.right, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...primaryColor);
            doc.text(day, margins.left + 3, yPos + 5.5);
            yPos += 12;

            mealNames.forEach(meal => {
                const opt = dayItems.find(i => i.meal_name === meal);
                if (!opt) return;

                checkPageBreak(yPos, 15);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(...secondaryColor); // Secondary color for meal name (Desayuno, etc)
                doc.text(`${meal}:`, margins.left, yPos);

                doc.setTextColor(...textColor); // Reset to slate for recipe name
                doc.setFont('helvetica', 'normal');
                const name = getOptName(opt);
                // measure width
                const mealWidth = doc.getTextWidth(`${meal}:  `);

                const maxWidth = 210 - margins.left - margins.right - mealWidth;
                const lines = doc.splitTextToSize(name, maxWidth);
                doc.text(lines, margins.left + mealWidth, yPos);

                yPos += (lines.length * 5);

                // Add ingredients
                const ingredients = getOptIngredients(opt);
                if (ingredients.length > 0) {
                    doc.setFontSize(9);
                    doc.setTextColor(...textColor);
                    ingredients.forEach(ing => {
                        checkPageBreak(yPos, 5);
                        const ingLines = doc.splitTextToSize(ing, 210 - margins.left - margins.right - 5);
                        doc.text(ingLines, margins.left + 5, yPos);
                        yPos += (ingLines.length * 4);
                    });
                    yPos += 1;
                }

                // Add description if available
                const desc = getOptDescription(opt);
                if (desc) {
                    doc.setFontSize(9);
                    doc.setTextColor(...lightColor);
                    const descLines = doc.splitTextToSize(desc, 210 - margins.left - margins.right - 5);
                    doc.text(descLines, margins.left + 5, yPos);
                    yPos += (descLines.length * 4) + 2;
                    doc.setFontSize(10);
                    doc.setTextColor(...textColor);
                } else {
                    yPos += 2;
                }
            });
            yPos += 6;
            checkPageBreak(yPos, 20);
        });
    } else {
        // --- OPEN PLAN SUMMARY ---
        checkPageBreak(yPos, 20);
        doc.setFillColor(...brandLight);
        doc.rect(margins.left, yPos, 210 - margins.left - margins.right, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text("Resumen de Opciones", margins.left + 3, yPos + 5.5);
        yPos += 12;

        mealNames.forEach(meal => {
            const mealItems = items.filter(i => i.meal_name === meal);
            if (mealItems.length === 0) return;

            checkPageBreak(yPos, 15);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(...secondaryColor); // Secondary color for category
            doc.text(meal, margins.left, yPos);
            yPos += 5;

            doc.setTextColor(...textColor);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            mealItems.forEach((opt, idx) => {
                const name = getOptName(opt);
                const lines = doc.splitTextToSize(`• Opción ${idx + 1}: ${name}`, 210 - margins.left - margins.right - 5);
                checkPageBreak(yPos, lines.length * 4);
                doc.text(lines, margins.left + 5, yPos);
                yPos += (lines.length * 4);
            });
            yPos += 4;
        });

        yPos += 10;
        checkPageBreak(yPos, 20);

        // --- DETAILED OPEN PLAN ---
        for (const meal of mealNames) {
            const mealItems = items.filter(i => i.meal_name === meal);
            if (mealItems.length === 0) continue;

            const expectedName = meal.toLowerCase().includes('desayun') ? 'Desayuno' :
                meal.toLowerCase().includes('almuerz') ? 'Almuerzo' :
                    meal.toLowerCase().includes('comid') ? 'Almuerzo' : // Fallback Comida to Almuerzo cover if missing Comida
                        meal.toLowerCase().includes('meriend') ? 'Merienda' :
                            meal.toLowerCase().includes('cen') ? 'Cena' : meal;

            const coverImg = await loadImageAsBase64(`/covers/${expectedName}.png`);
            if (coverImg) {
                // If not on a fresh page (or after Portada), add page for cover
                if (yPos > 30) doc.addPage();
                doc.addImage(coverImg, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
                coverPages.add(doc.internal.getNumberOfPages());

                // Add page for the content
                doc.addPage();
                drawHeader();
                yPos = 30;
            } else {
                checkPageBreak(yPos, 20);
            }

            doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
            // Optional: Use lighter primary color for meal header
            doc.rect(margins.left, yPos, 210 - margins.left - margins.right, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(meal, margins.left + 3, yPos + 5.5);
            yPos += 12;

            doc.setTextColor(...textColor);
            mealItems.forEach((opt, idx) => {
                checkPageBreak(yPos, 15);

                const name = getOptName(opt);
                doc.setFont('helvetica', 'bold');
                doc.text(`Opción ${idx + 1}:`, margins.left, yPos);

                doc.setFont('helvetica', 'normal');
                const titleWidth = doc.getTextWidth(`Opción ${idx + 1}:  `);
                const maxWidth = 210 - margins.left - margins.right - titleWidth;
                const lines = doc.splitTextToSize(name, maxWidth);

                doc.text(lines, margins.left + titleWidth, yPos);
                yPos += (lines.length * 5);

                // Add ingredients
                const ingredients = getOptIngredients(opt);
                if (ingredients.length > 0) {
                    doc.setFontSize(9);
                    doc.setTextColor(...textColor);
                    ingredients.forEach(ing => {
                        checkPageBreak(yPos, 5);
                        const ingLines = doc.splitTextToSize(ing, 210 - margins.left - margins.right - 5);
                        doc.text(ingLines, margins.left + 5, yPos);
                        yPos += (ingLines.length * 4);
                    });
                    yPos += 1;
                }

                // Add description if available
                const desc = getOptDescription(opt);
                if (desc) {
                    doc.setFontSize(9);
                    doc.setTextColor(...lightColor);
                    const descLines = doc.splitTextToSize(desc, 210 - margins.left - margins.right - 5);
                    doc.text(descLines, margins.left + 5, yPos);
                    yPos += (descLines.length * 4) + 2;
                    doc.setFontSize(10);
                    doc.setTextColor(...textColor);
                } else {
                    yPos += 2;
                }
                yPos += 2;
            });
            yPos += 6;
        }
    }

    // --- SHOPPING LIST FOR CLOSED PLANS ---
    if (isClosedPlan) {
        const shoppingList = aggregateIngredients(items);
        if (shoppingList.length > 0) {
            // Need a page break for the shopping list
            doc.addPage();
            currentPage++;
            yPos = 30;
            drawHeader();

            doc.setFillColor(...brandLight);
            doc.rect(margins.left, yPos, 210 - margins.left - margins.right, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...primaryColor);
            doc.text("Lista de la Compra Semanal", margins.left + 3, yPos + 5.5);
            yPos += 12;

            doc.setTextColor(...textColor);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);

            const col1X = margins.left + 5;
            const col2X = margins.left + 95;
            let currentX = col1X;

            shoppingList.forEach((item) => {
                if (currentX === col1X) {
                    checkPageBreak(yPos, 6);
                }

                const qtyStr = item.qty > 0 ? `${Math.round(item.qty)}g - ` : '';
                const line = `• ${qtyStr}${item.name}`;
                // Truncate to fit half page
                const truncated = line.length > 45 ? line.substring(0, 42) + '...' : line;

                doc.text(truncated, currentX, yPos);

                if (currentX === col1X) {
                    currentX = col2X;
                } else {
                    currentX = col1X;
                    yPos += 6;
                }
            });
        }
    }

    // Call drawFooter on all pages EXCEPT covers
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        if (!coverPages.has(i)) {
            doc.setPage(i);
            drawFooter();
        }
    }

    // Save PDF
    const filename = `Plan_${plan.name.replace(/\s+/g, '_')}_${patient?.first_name || 'Paciente'}.pdf`;
    doc.save(filename);

    function checkPageBreak(currentY, neededHeight) {
        if (currentY + neededHeight > 297 - margins.bottom) {
            doc.addPage();
            drawHeader();
            yPos = 30;
        }
    }
};

// Helper for Hex to RGB
function hexToRgb(hex) {
    if (!hex) return null;
    let r = 0, g = 0, b = 0;
    // 3 digits
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    }
    // 6 digits
    else if (hex.length === 7) {
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
    }
    return [r, g, b];
}
