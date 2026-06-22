const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    for (const [search, replace] of Object.entries(replacements)) {
        if (content.includes(search)) {
            content = content.split(search).join(replace);
            modified = true;
        }
    }
    if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated: ${filePath}`);
    }
}

const replacements = {
    '/dashboard/production/items': '/dashboard/inventory/items',
    '/dashboard/production/categories': '/dashboard/inventory/categories',
    '@/app/dashboard/production/actions': '@/app/dashboard/inventory/items/actions',
    '@/app/dashboard/production/categories/actions': '@/app/dashboard/inventory/categories/actions'
};

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            replaceInFile(fullPath, replacements);
        }
    }
}

walkDir(path.join(__dirname, 'src'));
