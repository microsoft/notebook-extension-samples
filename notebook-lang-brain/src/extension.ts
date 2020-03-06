/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	// fake definitions
	context.subscriptions.push(vscode.languages.registerDefinitionProvider({ scheme: 'vscode-notebook' }, new class implements vscode.DefinitionProvider {

		provideDefinition(document: vscode.TextDocument, position: vscode.Position) {

			const range = document.getWordRangeAtPosition(position);
			if (!range) {
				return;
			}

			const word = document.getText(range);
			const locs: vscode.Location[] = [];

			for (let doc of vscode.workspace.textDocuments) {

				if (doc.uri.scheme !== 'vscode-notebook' || doc.uri.query !== document.uri.query) {
					// must be a cell from this notebook
					continue;
				}

				const text = doc.getText();
				const pattern = new RegExp(`\\b${word}\\b`, 'g');

				while (pattern.exec(text)) {
					const loc = new vscode.Location(doc.uri, doc.getWordRangeAtPosition(doc.positionAt(pattern.lastIndex))!);
					locs.push(loc);
				}
			}

			// return all?
			return locs[0];
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

