import sys
import re
file_path = 'c:/Users/Iris Del Rosario/Desktop/APP NUTRICION/nutri-crm/src/components/Plans/OpenPlanEditor.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix syntax error
content = re.sub(r'\}\s*\)\}\s*\}\s*\)\}\s*<\/div>\s*\);\s*\}', r'}\n            )}\n        </div>\n    );\n}', content)

# Fix defaults logic
content = content.replace("const tMeal = targetMeal || 'all';\n        const mealsToApply = tMeal === 'all' ? mealNames : [tMeal];", "if (!targetMeal) { showToast('Por favor, selecciona una comida de destino', 'warning'); return; }\n\n        const mealsToApply = targetMeal === 'all' ? mealNames : [targetMeal];")
content = content.replace("const tMeal = targetMeal || 'all';\r\n        const mealsToApply = tMeal === 'all' ? mealNames : [tMeal];", "if (!targetMeal) { showToast('Por favor, selecciona una comida de destino', 'warning'); return; }\r\n\r\n        const mealsToApply = targetMeal === 'all' ? mealNames : [targetMeal];")

# Fix setCopyModalInfo
content = content.replace("setCopyModalInfo({ opt, targetMeal: 'all' });", "setCopyModalInfo({ opt, targetMeal: '' });")

# Fix Options
content = content.replace('<option value="all">Todas las comidas</option>', '<option value="" disabled>-- Selecciona una comida --</option>\n                                        <option value="all">Todas las comidas</option>')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
