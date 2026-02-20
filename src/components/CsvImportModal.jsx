import { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, AlertTriangle, CheckCircle2, Download } from 'lucide-react';

/**
 * CsvImportModal — generic CSV import modal for Foods and Recipes.
 * Props:
 *   type: 'foods' | 'recipes'
 *   onImport(rows) — callback with parsed rows to persist
 *   onClose() — close modal
 *   foods — array of existing foods (needed for recipe ingredient matching)
 */

function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if ((ch === ',' || ch === ';') && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current.trim());
    return result;
}

function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
    const rows = lines.slice(1).map(line => {
        const values = parseCsvLine(line);
        const obj = {};
        headers.forEach((h, i) => { obj[h] = values[i] || ''; });
        return obj;
    });
    return { headers, rows };
}

const FOOD_CSV_EXAMPLE = `nombre,kcal,carbohidratos,proteinas,grasas,etiquetas
Pechuga de pollo,165,0,31,3.6,proteina;carne
Arroz blanco,130,28.2,2.7,0.3,cereal
Plátano,89,22.8,1.1,0.3,fruta
Aceite de oliva,884,0,0,100,grasa;vegano`;

const RECIPE_CSV_EXAMPLE = `nombre,descripcion,ingredientes
Ensalada César,"Ensalada clásica con pollo","Pechuga de pollo:150;Lechuga:100;Parmesano:20"
Batido de plátano,"Batido energético","Plátano:120;Leche desnatada:200;Avena:30"`;

export default function CsvImportModal({ type, onImport, onClose, foods = [] }) {
    const fileRef = useRef(null);
    const [rawText, setRawText] = useState('');
    const [parsed, setParsed] = useState(null);
    const [errors, setErrors] = useState([]);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null);

    const isFood = type === 'foods';
    const exampleCsv = isFood ? FOOD_CSV_EXAMPLE : RECIPE_CSV_EXAMPLE;

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target.result;
            setRawText(text);
            processText(text);
        };
        reader.readAsText(file, 'UTF-8');
    };

    const processText = (text) => {
        setResult(null);
        const { headers, rows } = parseCsv(text);
        const errs = [];

        if (isFood) {
            // Expected: nombre, kcal, carbohidratos, proteinas, grasas, etiquetas(optional)
            const nameCol = headers.find(h => ['nombre', 'name', 'alimento'].includes(h));
            const kcalCol = headers.find(h => ['kcal', 'calorias', 'kcal_per_100g', 'energia'].includes(h));
            const carbCol = headers.find(h => ['carbohidratos', 'carbs', 'hc', 'carbs_per_100g', 'hidratos'].includes(h));
            const protCol = headers.find(h => ['proteinas', 'protein', 'prot', 'proteina', 'protein_per_100g'].includes(h));
            const fatCol = headers.find(h => ['grasas', 'fat', 'grasa', 'fat_per_100g', 'lipidos'].includes(h));
            const tagCol = headers.find(h => ['etiquetas', 'tags', 'categorias', 'tipo'].includes(h));

            if (!nameCol) errs.push('Columna "nombre" no encontrada');
            if (!kcalCol) errs.push('Columna "kcal" no encontrada');

            const parsed = rows.map((row, idx) => {
                const name = row[nameCol]?.trim();
                if (!name) { errs.push(`Fila ${idx + 2}: nombre vacío`); return null; }
                const kcal = parseFloat(row[kcalCol]) || 0;
                const carbs = parseFloat(row[carbCol]) || 0;
                const protein = parseFloat(row[protCol]) || 0;
                const fat = parseFloat(row[fatCol]) || 0;
                const tags = row[tagCol] ? row[tagCol].split(';').map(t => t.trim().toLowerCase()).filter(Boolean) : [];
                return { name, kcal_per_100g: kcal, carbs_per_100g: carbs, protein_per_100g: protein, fat_per_100g: fat, tags, is_active: true };
            }).filter(Boolean);

            setErrors(errs);
            setParsed(parsed);
        } else {
            // Recipes: nombre, descripcion, ingredientes (formato: "Alimento1:cantidad;Alimento2:cantidad")
            const nameCol = headers.find(h => ['nombre', 'name', 'receta'].includes(h));
            const descCol = headers.find(h => ['descripcion', 'description', 'desc'].includes(h));
            const ingCol = headers.find(h => ['ingredientes', 'ingredients', 'composicion'].includes(h));

            if (!nameCol) errs.push('Columna "nombre" no encontrada');

            const parsed = rows.map((row, idx) => {
                const name = row[nameCol]?.trim();
                if (!name) { errs.push(`Fila ${idx + 2}: nombre vacío`); return null; }
                const description = row[descCol]?.trim() || '';
                const ingredientsRaw = row[ingCol]?.trim() || '';
                const ingredients = [];
                if (ingredientsRaw) {
                    const parts = ingredientsRaw.split(';');
                    parts.forEach(part => {
                        const [foodName, qty] = part.split(':').map(s => s.trim());
                        if (!foodName) return;
                        // Find matching food in existing foods
                        const match = foods.find(f => f.name.toLowerCase() === foodName.toLowerCase());
                        if (match) {
                            ingredients.push({ food_id: match.id, quantity_grams: parseFloat(qty) || 100 });
                        } else {
                            errs.push(`Fila ${idx + 2}: alimento "${foodName}" no encontrado en la base de datos`);
                        }
                    });
                }
                return { name, description, tags: [], ingredients };
            }).filter(Boolean);

            setErrors(errs);
            setParsed(parsed);
        }
    };

    const handleImport = async () => {
        if (!parsed || parsed.length === 0) return;
        setImporting(true);
        try {
            const count = await onImport(parsed);
            setResult({ success: true, count: count || parsed.length });
        } catch (err) {
            setResult({ success: false, message: err.message });
        } finally {
            setImporting(false);
        }
    };

    const downloadExample = () => {
        const blob = new Blob([exampleCsv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = isFood ? 'alimentos_ejemplo.csv' : 'recetas_ejemplo.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet size={20} className="text-green-600" />
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                            Importar {isFood ? 'Alimentos' : 'Recetas'} desde CSV
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg dark:hover:bg-slate-800">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Format instructions */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Formato del CSV</h3>
                        {isFood ? (
                            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                                <p>Columnas requeridas: <b>nombre</b>, <b>kcal</b>, <b>carbohidratos</b>, <b>proteinas</b>, <b>grasas</b></p>
                                <p>Columna opcional: <b>etiquetas</b> (separadas por <code>;</code>)</p>
                                <p>Separador de columnas: <code>,</code> o <code>;</code>  •  Valores por 100g</p>
                            </div>
                        ) : (
                            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                                <p>Columnas requeridas: <b>nombre</b></p>
                                <p>Opcionales: <b>descripcion</b>, <b>ingredientes</b></p>
                                <p>Ingredientes: <code>Alimento1:cantidad;Alimento2:cantidad</code></p>
                                <p className="text-amber-500">⚠️ Los alimentos deben existir previamente en la base de datos</p>
                            </div>
                        )}
                        <button onClick={downloadExample} className="mt-2 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                            <Download size={14} /> Descargar CSV de ejemplo
                        </button>
                    </div>

                    {/* File upload */}
                    <div>
                        <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
                        <button
                            onClick={() => fileRef.current?.click()}
                            className="w-full py-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-400 hover:border-primary-400 hover:text-primary-500 transition-all flex flex-col items-center justify-center gap-2"
                        >
                            <Upload size={24} />
                            <span className="text-sm font-medium">Seleccionar archivo CSV</span>
                            <span className="text-xs">o arrastra aquí</span>
                        </button>
                    </div>

                    {/* Errors */}
                    {errors.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle size={14} className="text-amber-500" />
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Advertencias ({errors.length})</span>
                            </div>
                            <div className="max-h-24 overflow-y-auto space-y-0.5">
                                {errors.map((err, i) => (
                                    <p key={i} className="text-xs text-amber-600 dark:text-amber-400">{err}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Preview */}
                    {parsed && parsed.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Vista previa ({parsed.length} {isFood ? 'alimentos' : 'recetas'})
                            </h3>
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                                {isFood ? (
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                                                <th className="text-left py-1.5 px-3 font-semibold text-slate-500">Nombre</th>
                                                <th className="text-right py-1.5 px-2 font-semibold text-orange-500">Kcal</th>
                                                <th className="text-right py-1.5 px-2 font-semibold text-amber-500">HC</th>
                                                <th className="text-right py-1.5 px-2 font-semibold text-blue-500">Prot</th>
                                                <th className="text-right py-1.5 px-2 font-semibold text-rose-500">Grasas</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsed.slice(0, 20).map((f, i) => (
                                                <tr key={i} className="border-b border-slate-100 dark:border-slate-700">
                                                    <td className="py-1.5 px-3 text-slate-700 dark:text-slate-300">{f.name}</td>
                                                    <td className="py-1.5 px-2 text-right text-orange-600">{f.kcal_per_100g}</td>
                                                    <td className="py-1.5 px-2 text-right text-amber-600">{f.carbs_per_100g}g</td>
                                                    <td className="py-1.5 px-2 text-right text-blue-600">{f.protein_per_100g}g</td>
                                                    <td className="py-1.5 px-2 text-right text-rose-600">{f.fat_per_100g}g</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {parsed.slice(0, 20).map((r, i) => (
                                            <div key={i} className="px-3 py-2">
                                                <div className="font-medium text-slate-700 dark:text-slate-300">{r.name}</div>
                                                {r.description && <div className="text-slate-400 mt-0.5">{r.description}</div>}
                                                <div className="text-slate-400 mt-0.5">{r.ingredients.length} ingredientes</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {parsed.length > 20 && <p className="text-xs text-slate-400 mt-1 text-center">...y {parsed.length - 20} más</p>}
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className={`rounded-xl p-3 ${result.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                            <div className="flex items-center gap-2">
                                {result.success ? <CheckCircle2 size={16} className="text-green-500" /> : <AlertTriangle size={16} className="text-red-500" />}
                                <span className={`text-sm font-medium ${result.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                    {result.success ? `¡${result.count} ${isFood ? 'alimentos' : 'recetas'} importados correctamente!` : result.message}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg dark:hover:bg-slate-800">
                        Cerrar
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!parsed || parsed.length === 0 || importing || result?.success}
                        className="btn btn-primary text-sm py-2 disabled:opacity-50"
                    >
                        <Upload size={16} />
                        {importing ? 'Importando...' : `Importar ${parsed?.length || 0} ${isFood ? 'alimentos' : 'recetas'}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
