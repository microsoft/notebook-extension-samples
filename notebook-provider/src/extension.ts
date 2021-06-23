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

	context.subscriptions.push(vscode.workspace.registerNotebookContentProvider('jupyter', new NotebookProvider('jupyter', context.extensionPath, true)));
	context.subscriptions.push(vscode.workspace.registerNotebookContentProvider('jupytertest', new NotebookProvider('jupytertest', context.extensionPath, false)));

	vscode.commands.registerCommand('notebook.saveToMarkdown', () => {
		if (vscode.window.activeNotebookEditor) {
			let { document } = vscode.window.activeNotebookEditor;
			let uri = document.uri;
			let fsPath = uri.fsPath;
			let baseName = path.basename(fsPath, path.extname(fsPath));
			let newFSPath = path.join(path.dirname(fsPath), baseName + '.md');

			let content = '';

			document.getCells().forEach(cell => {
				let language = cell.document.languageId || '';
				if(cell.kind == vscode.NotebookCellKind.Markup) {
					content += cell.document.getText() + '\n';
				} else {
					content += '```' + language + '\n' + cell.document.getText() + '```\n\n';
				}
			})

			fs.writeFileSync(newFSPath, content);
		}
	});
}
