const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENTRY_FILE = './scripts/index.js';
const OUTPUT_DIR = './dist';
const OUTPUT_FILENAME = 'kaedo.js';
const GLOBAL_NAME = 'Kaedo';
const cwd = process.cwd();

if (require.main === module) {
    bundle();
}

function bundle() {
    const modules = new Map();
    const processedFiles = new Set();

    // Process the entry file
    const entryPath = path.resolve(cwd, ENTRY_FILE);
    const entryId = getModuleId(entryPath);

    processModule(entryPath, modules, processedFiles);

    // Generate the bundle
    const bundleCode = generateBundle(modules, entryId);

    // Create output directory if it doesn't exist
    const outputPath = path.resolve(cwd, OUTPUT_DIR);
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }

    // Write the final file
    const outputFile = path.join(outputPath, OUTPUT_FILENAME);
    fs.writeFileSync(outputFile, bundleCode, 'utf8');
}

function processModule(filePath, modules, processedFiles) {
    if (processedFiles.has(filePath)) {
        return;
    }

    processedFiles.add(filePath);
    const moduleId = getModuleId(filePath);

    let code = fs.readFileSync(filePath, 'utf8');
    const imports = [];
    const exports = {
        named: [],
        default: null,
        hasExports: false
    };

    // Process imports
    code = code.replace(
        /import\s+(?:(?:\*\s+as\s+(\w+))|(?:{([^}]+)})|(\w+))\s+from\s+['"]([^'"]+)['"]/g,
        (match, asteriskAs, namedImports, defaultImport, source) => {
            const resolvedPath = resolveImport(source, filePath);
            const importId = getModuleId(resolvedPath);

            // Recursively process dependencies
            if (fs.existsSync(resolvedPath)) {
                processModule(resolvedPath, modules, processedFiles);
            }

            if (asteriskAs) {
                // import * as name from 'module'
                imports.push({
                    type: 'namespace',
                    as: asteriskAs,
                    moduleId: importId
                });
                return `const ${asteriskAs} = __require('${importId}');`;
            } else if (namedImports) {
                // import { a, b as c } from 'module'
                const names = namedImports.split(',').map(n => {
                    const parts = n.trim().split(/\s+as\s+/);
                    return {
                        imported: parts[0].trim(),
                        local: parts[1] ? parts[1].trim() : parts[0].trim()
                    };
                });
                imports.push({
                    type: 'named',
                    names,
                    moduleId: importId
                });
                const declarations = names.map(n =>
                    `${n.local} = __require('${importId}').${n.imported}`
                ).join(', ');
                return `const ${declarations};`;
            } else if (defaultImport) {
                // import name from 'module'
                imports.push({
                    type: 'default',
                    as: defaultImport,
                    moduleId: importId
                });
                return `const ${defaultImport} = __require('${importId}').default;`;
            }

            return match;
        }
    );

    // Process export default
    code = code.replace(
        /export\s+default\s+/g,
        (match) => {
            exports.hasExports = true;
            exports.default = true;
            return `__exports.default = `;
        }
    );

    // Process export { ... }
    code = code.replace(
        /export\s+{([^}]+)}/g,
        (match, namedExports) => {
            exports.hasExports = true;
            const names = namedExports.split(',').map(n => {
                const parts = n.trim().split(/\s+as\s+/);
                return {
                    local: parts[0].trim(),
                    exported: parts[1] ? parts[1].trim() : parts[0].trim()
                };
            });
            exports.named.push(...names);
            const assignments = names.map(n =>
                `__exports.${n.exported} = ${n.local};`
            ).join(' ');
            return assignments;
        }
    );

    // Process export const/let/var/function/class (including async)
    code = code.replace(
        /export\s+(async\s+)?(const|let|var|function|class)\s+(\w+)/g,
        (match, async, keyword, name) => {
            exports.hasExports = true;
            exports.named.push({ local: name, exported: name });
            return `${async || ''}${keyword} ${name}`;
        }
    );

    // Add named exports assignments at the end
    if (exports.named.length > 0) {
        const namedExportsCode = exports.named
            .map(n => `__exports.${n.exported} = ${n.local};`)
            .join('\n  ');
        code = code + `\n  ${namedExportsCode}`;
    }

    modules.set(moduleId, {
        id: moduleId,
        code,
        imports,
        exports,
        path: filePath
    });
}

function generateBundle(modules, entryId) {
    const modulesCode = Array.from(modules.values())
        .map(mod => {
            return `  '${mod.id}': function(__exports, __require) {
${mod.code}
  }`;
        })
        .join(',\n\n');

    return `(function(global) {
  'use strict';
  
  const __modules = {};
  const __cache = {};
  
  // Define all modules
  const __definitions = {
${modulesCode}
  };
  
  // Load a module
  function __require(moduleId) {
    if (__cache[moduleId]) {
      return __cache[moduleId];
    }
    
    const __exports = {};
    __cache[moduleId] = __exports;
    
    if (__definitions[moduleId]) {
      __definitions[moduleId](__exports, __require);
      __modules[moduleId] = __exports;
    }
    
    return __exports;
  }
  
  // Load the entry module
  const entryModule = __require('${entryId}');
  
  // Expose to global
  global.${GLOBAL_NAME} = entryModule.default || entryModule;
  
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
`;
}

function resolveImport(source, fromFile) {
    const fromDir = path.dirname(fromFile);

    if (source.startsWith('.')) {
        // Relative import
        let resolved = path.resolve(fromDir, source);

        // Try adding .js if no extension
        if (!path.extname(resolved)) {
            if (fs.existsSync(resolved + '.js')) {
                resolved += '.js';
            } else if (fs.existsSync(path.join(resolved, 'index.js'))) {
                resolved = path.join(resolved, 'index.js');
            }
        }

        return resolved;
    }

    // Absolute import (node_modules, etc)
    // Here you can add logic to resolve node_modules
    return source;
}

function getModuleId(filePath) {
    // Generate a unique ID based on relative path
    const relativePath = path.relative(cwd, filePath);
    return crypto
        .createHash('md5')
        .update(relativePath)
        .digest('hex')
        .substring(0, 8);
}
