const fs = require('fs');
const path = require('path');

function cleanupSW() {
    ['public/sw.js', 'out/sw.js'].forEach(f => {
        const fullPath = path.resolve(f);
        if (fs.existsSync(fullPath)) {
            try {
                fs.unlinkSync(fullPath);
                console.log('Deleted', f);
            } catch (e) {
                console.error('Error deleting', f, e.message);
            }
        }
    });
}

function toggleAPIs(disable) {
    const apiDir = path.resolve('src/app/api');
    if (!fs.existsSync(apiDir)) return;

    const walk = (dir) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
                walk(filePath);
            } else if (file === 'route.ts' && disable) {
                fs.renameSync(filePath, filePath + '.bak');
                console.log(`Disabled: ${filePath}`);
            } else if (file === 'route.ts.bak' && !disable) {
                fs.renameSync(filePath, filePath.replace('.bak', ''));
                console.log(`Enabled: ${filePath.replace('.bak', '')}`);
            }
        });
    };
    walk(apiDir);
}

function toggleMiddleware(disable) {
    const middleware = path.resolve('src/middleware.ts');
    if (disable && fs.existsSync(middleware)) {
        fs.renameSync(middleware, middleware + '.bak');
        console.log('Disabled Middleware');
    } else if (!disable && fs.existsSync(middleware + '.bak')) {
        fs.renameSync(middleware + '.bak', middleware);
        console.log('Enabled Middleware');
    }
}

const action = process.argv[2];

if (action === 'pre') {
    cleanupSW();
    toggleAPIs(true);
    toggleMiddleware(true);
} else if (action === 'post') {
    toggleAPIs(false);
    toggleMiddleware(false);
} else if (action === 'clean') {
    cleanupSW();
}
