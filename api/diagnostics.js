const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const cwd = process.cwd();
    const diagnostics = {cwd: cwd, buildOutput: null, buildError: null, files: {}, directories: {}};

    try {
        diagnostics.buildOutput = execSync('npm run build 2>&1', {cwd, encoding: 'utf-8', timeout: 30000});
    } catch (e) {
        diagnostics.buildError = e.message;
        diagnostics.buildOutput = e.stdout || e.stderr || 'No output';
    }

    const pathsToCheck = ['dist', 'dist/world', 'dist/world/World.js', 'src', 'package.json', 'tsconfig.json'];
    pathsToCheck.forEach(p => {
        const fullPath = path.join(cwd, p);
        try {
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                diagnostics.directories[p] = 'EXISTS';
                try {
                    const files = fs.readdirSync(fullPath);
                    diagnostics.directories[p + '_contents'] = files.slice(0, 20);
                } catch (e) {
                    diagnostics.directories[p + '_contents'] = 'ERROR: ' + e.message;
                }
            } else {
                diagnostics.files[p] = 'EXISTS';
            }
        } catch (err) {
            diagnostics.files[p] = err.code === 'ENOENT' ? 'NOT_FOUND' : 'ERROR: ' + err.message;
        }
    });

    res.status(200).json(diagnostics);
};