/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { NotebookProvider } from './notebookProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log(context.extensionPath);
	console.log(context.globalStorageUri.fsPath);

	context.subscriptions.push(vscode.notebook.registerNotebookContentProvider('jupyter', new NotebookProvider('jupyter', context.extensionPath, true)));
	context.subscriptions.push(vscode.notebook.registerNotebookContentProvider('jupytertest', new NotebookProvider('jupytertest', context.extensionPath, false)));
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
		if (vscode.window.activeNotebookEditor) {
			let { document } = vscode.window.activeNotebookEditor;
			let uri = document.uri;
			let fsPath = uri.fsPath;
			let baseName = path.basename(fsPath, path.extname(fsPath));
			let newFSPath = path.join(path.dirname(fsPath), baseName + '.md');

			let content = '';

			for (let i = 0; i < document.cells.length; i++) {
				let cell = document.cells[i];
				let language = cell.language || '';
				if (cell.cellKind === vscode.CellKind.Markdown) {
					content += cell.document.getText() + '\n';
				} else {
					content += '```' + language + '\n' + cell.document.getText() + '```\n\n';
				}
			}

			fs.writeFileSync(newFSPath, content);
		}
	});
}
