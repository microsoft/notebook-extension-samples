/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	// fake definitions
	context.subscriptions.push(vscode.languages.registerDefinitionProvider({ scheme: 'vscode-notebook' }, new class implements vscode.DefinitionProvider {

		async provideDefinition(document: vscode.TextDocument, position: vscode.Position) {

			if (!vscode.window.activeNotebookDocument) {
				// this is bad, a provider should be self-contained
				return;
			}

			const range = document.getWordRangeAtPosition(position);
			if (!range) {
				return;
			}

			const word = document.getText(range);
			const locs: vscode.Location[] = [];
			let found = false;

			for (let cell of vscode.window.activeNotebookDocument.cells) {
				found = found || cell.uri === document.uri;

				const doc = await vscode.workspace.openTextDocument(cell.uri);
				const text = doc.getText();
				const pattern = new RegExp(`\\b${word}\\b`, 'g');

				while (pattern.exec(text)) {
					const loc = new vscode.Location(doc.uri, doc.getWordRangeAtPosition(doc.positionAt(pattern.lastIndex))!);
					locs.push(loc);
				}
			}

			// return all?
			return found ? locs[0] : undefined;
		}
	}));

	// fake outline
	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider({ scheme: 'vscode-notebook' }, new class implements vscode.DocumentSymbolProvider {
		provideDocumentSymbols(document: vscode.TextDocument): vscode.ProviderResult<vscode.DocumentSymbol[]> {
			const result: vscode.DocumentSymbol[] = [];
			for (let i = 0; i < document.lineCount; i += 2) {
				const line = document.lineAt(i);
				if (!line.isEmptyOrWhitespace) {
					result.push(new vscode.DocumentSymbol(line.text.substr(0, 10), line.text.substr(10), vscode.SymbolKind.Object, line.range, line.range));
				}
			}
			return result;
		}
	}));
}

