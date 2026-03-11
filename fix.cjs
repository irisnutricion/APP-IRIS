const fs = require('fs');

const filePath = 'c:/Users/Iris Del Rosario/Desktop/APP NUTRICION/nutri-crm/src/components/Plans/OpenPlanEditor.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix syntax error
content = content.replace(/\)\}\s*\)\}\s*<\/div>\s*\);\s*\}/, ')}\n        </div>\n    );\n}');

// Fix defaults logic
content = content.replace("const tMeal = targetMeal || 'all';\n        const mealsToApply = tMeal === 'all' ? mealNames : [tMeal];", "if (!targetMeal) { showToast('Por favor, selecciona una comida de destino', 'warning'); return; }\n\n        const mealsToApply = targetMeal === 'all' ? mealNames : [targetMeal];");
content = content.replace("const tMeal = targetMeal || 'all';\r\n        const mealsToApply = tMeal === 'all' ? mealNames : [tMeal];", "if (!targetMeal) { showToast('Por favor, selecciona una comida de destino', 'warning'); return; }\r\n\r\n        const mealsToApply = targetMeal === 'all' ? mealNames : [targetMeal];");

// Fix setCopyModalInfo
content = content.replace(/setCopyModalInfo\(\{ opt, targetMeal: 'all' \}\);/g, "setCopyModalInfo({ opt, targetMeal: '' });");

// Fix Options
content = content.replace('<option value="all">Todas las comidas</option>', '<option value="" disabled>-- Selecciona una comida --</option>\n                                        <option value="all">Todas las comidas</option>');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
