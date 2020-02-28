(function(e, a) { for(var i in a) e[i] = a[i]; }(exports, /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = __webpack_require__(1);
const path = __webpack_require__(2);
const fs = __webpack_require__(3);
const notebookProvider_1 = __webpack_require__(4);
function activate(context) {
    console.log(context.extensionPath);
    context.subscriptions.push(vscode.window.registerNotebookProvider('jupyter', new notebookProvider_1.NotebookProvider(context.extensionPath, true)));
    context.subscriptions.push(vscode.window.registerNotebookProvider('jupytertest', new notebookProvider_1.NotebookProvider(context.extensionPath, false)));
    // context.subscriptions.push(vscode.window.registerNotebookOutputRenderer(
    // 	'kerneltest',
    // 	{
    // 		type: 'display_data',
    // 		subTypes: [
    // 			'text/latex',
    // 			'text/markdown',
    // 			'application/json',
    // 			'application/vnd.plotly.v1+json',
    // 			'application/vnd.vega.v5+json'
    // 		]
    // 	},
    // 	{
    // 		render: () => {
    // 			return '<h1>kernel test renderer</h1>';
    // 		}
    // 	}
    // ));
    vscode.commands.registerCommand('notebook.saveToMarkdown', () => {
        if (vscode.window.activeNotebookDocument) {
            let document = vscode.window.activeNotebookDocument;
            let uri = document.uri;
            let fsPath = uri.fsPath;
            let baseName = path.basename(fsPath, path.extname(fsPath));
            let newFSPath = path.join(path.dirname(fsPath), baseName + '.md');
            let content = '';
            for (let i = 0; i < document.cells.length; i++) {
                let cell = document.cells[i];
                let language = cell.language || '';
                if (cell.cell_type === 'markdown') {
                    content += cell.getContent() + '\n';
                }
                else {
                    content += '```' + language + '\n' + cell.getContent() + '```\n\n';
                }
            }
            fs.writeFileSync(newFSPath, content);
        }
    });
}
exports.activate = activate;


/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = require("path");

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = require("fs");

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = __webpack_require__(1);
const path = __webpack_require__(2);
// const mjAPI = require('mathjax-node');
// mjAPI.config({
// 	MathJax: {
// 		// traditional MathJax configuration
// 	}
// });
// mjAPI.start();
class Cell {
    constructor(source, cell_type, _outputs) {
        this.source = source;
        this.cell_type = cell_type;
        this._outputs = _outputs;
        this.outputs = [];
    }
    containHTML() {
        return this._outputs && this._outputs.some(output => {
            if (output.output_type === 'display_data' && output.data['text/html']) {
                return true;
            }
            return false;
        });
    }
    insertDependencies(dependency) {
        this._outputs.unshift(dependency);
    }
    fillInOutputs() {
        if (this._outputs && this.outputs.length !== this._outputs.length) {
            this.outputs = this._outputs;
        }
    }
    outputsFullFilled() {
        return this._outputs && this.outputs.length === this._outputs.length;
    }
    clearOutputs() {
        this.outputs = [];
    }
}
exports.Cell = Cell;
class JupyterNotebook {
    constructor(_extensionPath, editor, notebookJSON, fillOutputs) {
        this._extensionPath = _extensionPath;
        this.notebookJSON = notebookJSON;
        this.fillOutputs = fillOutputs;
        this.mapping = new Map();
        this.preloadScript = false;
        this.displayOrders = [
            'application/vnd.*',
            'application/json',
            'application/javascript',
            'text/html',
            'image/svg+xml',
            'text/markdown',
            'image/svg+xml',
            'image/png',
            'image/jpeg',
            'text/plain'
        ];
        let cells = notebookJSON.cells.map(((raw_cell) => {
            var _a, _b;
            let outputs = [];
            if (fillOutputs) {
                outputs = raw_cell.outputs;
                if (!this.preloadScript) {
                    let containHTML = this.containHTML(raw_cell);
                    if (containHTML) {
                        this.preloadScript = true;
                        const scriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'dist', 'ipywidgets.js'));
                        let scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-resource' });
                        outputs.unshift({
                            'output_type': 'display_data',
                            'data': {
                                'text/html': [
                                    `<script src="${scriptUri}"></script>\n`,
                                ]
                            }
                        });
                    }
                }
            }
            let managedCell = editor.createCell(raw_cell.source ? raw_cell.source.join('') : '', ((_b = (_a = notebookJSON === null || notebookJSON === void 0 ? void 0 : notebookJSON.metadata) === null || _a === void 0 ? void 0 : _a.language_info) === null || _b === void 0 ? void 0 : _b.name) || 'python', raw_cell.cell_type, outputs);
            this.mapping.set(managedCell.handle, raw_cell);
            return managedCell;
        }));
        editor.document.languages = ['python'];
        editor.document.cells = cells;
        editor.document.displayOrder = this.displayOrders;
    }
    execute(document, cell) {
        if (cell) {
            let rawCell = this.mapping.get(cell.handle);
            if (!this.preloadScript) {
                let containHTML = this.containHTML(rawCell);
                if (containHTML) {
                    this.preloadScript = true;
                    const scriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'dist', 'ipywidgets.js'));
                    let scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-resource' });
                    rawCell.outputs.unshift({
                        'output_type': 'display_data',
                        'data': {
                            'text/html': [
                                `<script src="${scriptUri}"></script>\n`,
                            ]
                        }
                    });
                }
            }
            cell.outputs = rawCell.outputs;
        }
        else {
            if (!this.fillOutputs) {
                for (let i = 0; i < document.cells.length; i++) {
                    let cell = document.cells[i];
                    let rawCell = this.mapping.get(cell.handle);
                    if (!this.preloadScript) {
                        let containHTML = this.containHTML(rawCell);
                        if (containHTML) {
                            this.preloadScript = true;
                            const scriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'dist', 'ipywidgets.js'));
                            let scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-resource' });
                            rawCell.outputs.unshift({
                                'output_type': 'display_data',
                                'data': {
                                    'text/html': [
                                        `<script src="${scriptUri}"></script>\n`,
                                    ]
                                }
                            });
                        }
                    }
                    cell.outputs = rawCell.outputs;
                }
                this.fillOutputs = true;
            }
        }
    }
    containHTML(rawCell) {
        return rawCell.outputs && rawCell.outputs.some((output) => {
            if (output.output_type === 'display_data' && output.data['text/html']) {
                return true;
            }
            return false;
        });
    }
}
exports.JupyterNotebook = JupyterNotebook;
class NotebookProvider {
    constructor(_extensionPath, fillOutputs) {
        this._extensionPath = _extensionPath;
        this.fillOutputs = fillOutputs;
        this._onDidChangeNotebook = new vscode.EventEmitter();
        this.onDidChangeNotebook = this._onDidChangeNotebook.event;
        this._notebooks = new Map();
    }
    // async latexRenderer(value: string): Promise<vscode.MarkdownString> {
    // 	return new Promise((resolve, reject) => {
    // 		mjAPI.typeset({
    // 			math: value,
    // 			format: 'inline-TeX', // or "inline-TeX", "MathML"
    // 			svg: true
    // 		}, function (data: any) {
    // 			if (!data.errors) {
    // 				var encodedData = Buffer.from(data.svg).toString('base64');
    // 				resolve(new vscode.MarkdownString(`![value](data:image/svg+xml;base64,${encodedData})`));
    // 			} else {
    // 				reject();
    // 			}
    // 		});
    // 	});
    // }
    async resolveNotebook(editor) {
        try {
            let content = await vscode.workspace.fs.readFile(editor.document.uri);
            let json = {};
            try {
                json = JSON.parse(content.toString());
            }
            catch (_a) {
                json = {
                    cells: [{
                            cell_type: 'markdown',
                            source: [
                                '# header'
                            ]
                        }]
                };
            }
            let jupyterNotebook = new JupyterNotebook(this._extensionPath, editor, json, this.fillOutputs);
            this._notebooks.set(editor.document.uri.toString(), jupyterNotebook);
        }
        catch (_b) {
        }
    }
    async executeCell(document, cell) {
        let jupyterNotebook = this._notebooks.get(document.uri.toString());
        if (jupyterNotebook) {
            jupyterNotebook.execute(document, cell);
        }
    }
    async save(document) {
        let cells = [];
        for (let i = 0; i < document.cells.length; i++) {
            let lines = document.cells[i].getContent().split(/\r|\n|\r\n/g);
            let source = lines.map((value, index) => {
                if (index !== lines.length - 1) {
                    return value + '\n';
                }
                else {
                    return value;
                }
            });
            if (document.cells[i].cell_type === 'markdown') {
                cells.push({
                    source: source,
                    metadata: {
                        language_info: {
                            name: document.cells[i].language || 'markdown'
                        }
                    },
                    cell_type: document.cells[i].cell_type
                });
            }
            else {
                cells.push({
                    source: source,
                    metadata: {
                        language_info: {
                            name: document.cells[i].language || 'markdown'
                        }
                    },
                    cell_type: document.cells[i].cell_type,
                    outputs: []
                });
            }
        }
        let raw = this._notebooks.get(document.uri.toString());
        if (raw) {
            raw.notebookJSON.cells = cells;
            let content = JSON.stringify(raw.notebookJSON, null, 4);
            await vscode.workspace.fs.writeFile(document.uri, new TextEncoder().encode(content));
        }
        else {
            let content = JSON.stringify({ cells: cells }, null, 4);
            await vscode.workspace.fs.writeFile(document.uri, new TextEncoder().encode(content));
        }
        return true;
    }
}
exports.NotebookProvider = NotebookProvider;


/***/ })
/******/ ])));
//# sourceMappingURL=extension.js.map