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
			let thisIdx: number = -1;

			for (let doc of vscode.workspace.textDocuments.filter(doc => doc.uri.scheme === 'vscode-notebook')) {

				const text = doc.getText();
				const pattern = new RegExp(`\\b${word}\\b`, 'g');

				while (pattern.exec(text)) {
					const loc = new vscode.Location(doc.uri, doc.getWordRangeAtPosition(doc.positionAt(pattern.lastIndex))!);
					if (doc === document && loc.range.contains(position)) {
						thisIdx = locs.length;
					}
					locs.push(loc);
				}
			}

			// return all?
			if (thisIdx !== 0) {
				return locs[0];
			} else {
				return locs[thisIdx + 1 % locs.length];
			}
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

