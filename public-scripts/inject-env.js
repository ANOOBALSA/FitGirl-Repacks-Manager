const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const distPath = path.join(__dirname, '..', 'dist');

function parseEnv() {
    if (!fs.existsSync(envPath)) return {};
    const env = {};
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) return;
        const index = trimmedLine.indexOf('=');
        if (index > 0) {
            const key = trimmedLine.substring(0, index).trim();
            let value = trimmedLine.substring(index + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.substring(1, value.length - 1);
            }
            env[key] = value;
        }
    });
    return env;
}

function walk(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach((f) => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(dirPath);
    });
}

const envVars = parseEnv();
const keys = Object.keys(envVars);

if (keys.length === 0) {
    console.log('[INFO] No environment variables to inject (no .env file or empty).');
    process.exit(0);
}

console.log(`[INFO] Injecting ${keys.length} environment variables into ${distPath}...`);

let totalInjected = 0;

walk(distPath, (filePath) => {
    if (!filePath.endsWith('.js')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    keys.forEach((key) => {
        const value = envVars[key];
        
        // Pattern 1: process.env.KEY
        // Pattern 2: process.env['KEY'] or process.env["KEY"]
        // We use lookaheads/boundaries to avoid matching partial keys (e.g., MY_VAR matching MY_VAR_2)
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex1 = new RegExp(`process\\.env\\.${escapedKey}(\\b|(?=[^a-zA-Z0-9_]))`, 'g');
        const regex2 = new RegExp(`process\\.env\\[['"]${escapedKey}['"]\\]`, 'g');

        if (regex1.test(content)) {
            content = content.replace(regex1, (match, suffix) => `"${value.replace(/"/g, '\\"')}"${suffix}`);
            changed = true;
        }
        if (regex2.test(content)) {
            content = content.replace(regex2, `"${value.replace(/"/g, '\\"')}"`);
            changed = true;
        }
    });

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`[DONE] Injected values into: ${path.relative(distPath, filePath)}`);
        totalInjected++;
    }
});

console.log(`[SUCCESS] Injection complete. Modified ${totalInjected} files.`);
