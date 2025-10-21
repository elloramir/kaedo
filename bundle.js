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

    console.log(`Bundle created: ${outputFile}`);
    console.log(`Modules processed: ${modules.size}`);
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
        hasExports: false,
        namespace: null
    };

    code = forceSemicolons(code);
    code = minifyCode(code);

    // Process imports - improved regex to handle more cases
    code = code.replace(
        /import\s+(?:(?:\*\s+as\s+(\w+))|(?:{([^}]+)})|(\w+)|([\w\s,]*))\s+from\s+['"]([^'"]+)['"]/g,
        (match, asteriskAs, namedImports, defaultImport, mixedImports, source) => {
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
            } else if (mixedImports) {
                // import defaultExport, { namedExport } from 'module'
                const parts = mixedImports.split(',').map(p => p.trim());
                const defaultPart = parts.find(p => !p.startsWith('{'));
                const namedPart = parts.find(p => p.startsWith('{'));

                if (namedPart) {
                    const namedMatches = namedPart.match(/{([^}]+)}/);
                    if (namedMatches) {
                        const namedNames = namedMatches[1].split(',').map(n => {
                            const nameParts = n.trim().split(/\s+as\s+/);
                            return {
                                imported: nameParts[0].trim(),
                                local: nameParts[1] ? nameParts[1].trim() : nameParts[0].trim()
                            };
                        });

                        imports.push({
                            type: 'mixed',
                            default: defaultPart,
                            named: namedNames,
                            moduleId: importId
                        });

                        const namedDeclarations = namedNames.map(n =>
                            `${n.local} = __require('${importId}').${n.imported}`
                        ).join(', ');

                        return `const ${defaultPart} = __require('${importId}').default, ${namedDeclarations};`;
                    }
                }
            }

            return match;
        }
    );

    // Process export * from 'module'
    code = code.replace(
        /export\s*\*\s*from\s*['"]([^'"]+)['"]/g,
        (match, source) => {
            exports.hasExports = true;
            exports.namespace = source;

            const resolvedPath = resolveImport(source, filePath);
            const importId = getModuleId(resolvedPath);

            if (fs.existsSync(resolvedPath)) {
                processModule(resolvedPath, modules, processedFiles);
            }

            return `for (const key in __require('${importId}')) {
    if (key !== 'default' && !__exports.hasOwnProperty(key)) {
        __exports[key] = __require('${importId}')[key];
    }
}`;
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

    // Add named exports assignments at the end (only if not already handled)
    if (exports.named.length > 0 && !code.includes('__exports.')) {
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

    // Absolute import or node_modules
    // For node_modules, try to resolve from current directory
    if (!source.startsWith('/')) {
        const nodeModulesPath = path.resolve(cwd, 'node_modules', source);
        if (fs.existsSync(nodeModulesPath)) {
            return nodeModulesPath;
        }

        // Try with package.json resolution
        try {
            const packagePath = path.resolve(cwd, 'node_modules', source, 'package.json');
            if (fs.existsSync(packagePath)) {
                const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                const mainFile = pkg.main || 'index.js';
                return path.resolve(path.dirname(packagePath), mainFile);
            }
        } catch (e) {
            // Fall through to return source as-is
        }
    }

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

function minifyCode(code) {
    // Step 1: Protect strings and template literals
    const stringPlaceholders = [];
    let stringIndex = 0;

    code = code.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, (match) => {
        const placeholder = `__STR${stringIndex}__`;
        stringPlaceholders.push(match);
        stringIndex++;
        return placeholder;
    });

    // Step 2: Minify the protected code
    let minified = code
        // Remove single-line comments
        .replace(/\/\/.*$/gm, '')
        // Remove multi-line comments (careful with URLs in comments)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove extra whitespace (preserve necessary spaces)
        .replace(/\s+/g, ' ')
        // Clean up around operators and punctuation
        .replace(/\s*([=+-\/*%&|^!<>?:;,{}()[\]])\s*/g, '$1')
        // Fix specific cases where spaces are needed
        .replace(/(\b)(function|const|let|var|if|else|for|while|return|class|import|export|from|default|new|typeof|instanceof|void|in|of)(\s*)/g, '$1$2 ')
        .replace(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, '$1 $2')
        // Remove leading/trailing whitespace from lines
        .replace(/^\s+|\s+$/gm, '')
        // Collapse multiple newlines
        .replace(/\n+/g, '\n')
        .trim();

    // Step 3: Restore protected strings
    stringPlaceholders.forEach((str, index) => {
        minified = minified.replace(`__STR${index}__`, str);
    });

    return minified;
}

function forceSemicolons(code) {
    // Phase 1: Protect content that shouldn't be modified
    const protectedBlocks = [];
    let blockIndex = 0;

    // Protect strings
    code = code.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, (match) => {
        const placeholder = `__PROTECT${blockIndex}__`;
        protectedBlocks.push(match);
        blockIndex++;
        return placeholder;
    });

    // Protect regex literals
    code = code.replace(/\/(?:\\\/|[^\/\n])+\/[gimuy]*/g, (match) => {
        const placeholder = `__PROTECT${blockIndex}__`;
        protectedBlocks.push(match);
        blockIndex++;
        return placeholder;
    });

    // Protect template literals with expressions
    code = code.replace(/\$\{[^}]*\}/g, (match) => {
        const placeholder = `__PROTECT${blockIndex}__`;
        protectedBlocks.push(match);
        blockIndex++;
        return placeholder;
    });

    // Phase 2: Add semicolons where needed
    let processed = code
        // Add semicolon after lines ending with identifier/number/string/)]} that aren't followed by . or [
        .replace(/([a-zA-Z_$0-9)\]"'`])\s*\n(\s*[^\.\[<])/g, '$1;\n$2')
        // Add semicolon before lines starting with template literal if previous line doesn't end with ;
        .replace(/([^;])\s*\n\s*`/g, '$1;\n`')
        // Clean up multiple semicolons
        .replace(/;+/g, ';')
        // Remove semicolon before closing braces
        .replace(/;(\s*})/g, '$1')
        // Remove trailing semicolons
        .replace(/;\s*$/, '');

    // Phase 3: Restore protected content
    protectedBlocks.forEach((block, index) => {
        processed = processed.replace(`__PROTECT${index}__`, block);
    });

    return processed;
}
