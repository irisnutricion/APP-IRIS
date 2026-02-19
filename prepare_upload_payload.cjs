const fs = require('fs');
const path = require('path');

const [, , offsetStr, limitStr, outputFile] = process.argv;
const offset = parseInt(offsetStr, 10) || 0;
const limit = parseInt(limitStr, 10) || 1000;

if (!outputFile) {
    console.error('Usage: node prepare_upload_payload.cjs <offset> <limit> <outputFile>');
    process.exit(1);
}

const fileListPath = 'filtered_files.txt';
const baseDir = process.cwd();

try {
    const fileLines = fs.readFileSync(fileListPath, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const chunk = fileLines.slice(offset, offset + limit);

    if (chunk.length === 0) {
        fs.writeFileSync(outputFile, JSON.stringify([]));
        process.exit(0);
    }

    const filesPayload = chunk.map(filePath => {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const relativePath = path.relative(baseDir, filePath).replace(/\\/g, '/');
            return {
                path: relativePath,
                content: content
            };
        } catch (err) {
            console.error(`Error reading file ${filePath}: ${err.message}`);
            return null;
        }
    }).filter(item => item !== null);

    fs.writeFileSync(outputFile, JSON.stringify(filesPayload));
    console.log(`Wrote ${filesPayload.length} files to ${outputFile}`);

} catch (err) {
    console.error('Error processing files:', err);
    process.exit(1);
}
