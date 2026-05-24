export function downloadCSV(filename, data, columns) {
    if (!data || data.length === 0) return;

    const headers = columns.map(c => c.header).join(',');
    
    const rows = data.map(row => {
        return columns.map(c => {
            let val = c.getValue ? c.getValue(row) : row[c.key];
            if (val === null || val === undefined) val = '';
            // Escape quotes and wrap in quotes if there's a comma, newline or quotes
            const strVal = String(val).replace(/"/g, '""');
            if (strVal.includes(',') || strVal.includes('\n') || strVal.includes('"')) {
                return `"${strVal}"`;
            }
            return strVal;
        }).join(',');
    });

    const csvContent = [headers, ...rows].join('\n');
    // Add BOM for correct UTF-8 rendering in Excel
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
