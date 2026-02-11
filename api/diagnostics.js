const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const cwd = process.cwd();
    const diagnostics = {
        cwd: cwd,
        files: {},
        directories: {}
    };
    const pathsToCheck = ['dist', 'dist/world', 'dist/world/World.js'];
    pathsToCheck.forEach(p => {
        const fullPath = path.join(cwd, p);
        try {
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                diagnostics.directories[p] = 'EXISTS';
                try {
                    const files = fs.readdirSync(fullPath);
                    diagnostics.directories[p + '_contents'] = files;
                } catch (e) {
                    diagnostics.directories[p + '_contents'] = 'ERROR: ' + e.message;
                }
            } else {
                diagnostics.files[p] = 'EXISTS';
            }
        } catch (err) {
            if (err.code === 'ENOENT') {
                diagnostics.files[p] = 'NOT_FOUND';
            } else {
                diagnostics.files[p] = 'ERROR: ' + err.message;
            }
        }
    });
    res.status(200).json(diagnostics);
};
