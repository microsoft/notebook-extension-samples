/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as path from 'path';

export class NteractRenderer implements vscode.NotebookOutputRenderer {
	private _preloads: vscode.Uri[] = [];

	get preloads(): vscode.Uri[] {
		return this._preloads;
	}

	constructor(
		private _extensionPath: string
	) {
		this._preloads.push(vscode.Uri.file(path.join(this._extensionPath, 'nteract', 'nteract.js')));
	}

	// @ts-ignore
	render(document: vscode.NotebookDocument, output: vscode.CellOutput, mimeType: string): string {
		let renderOutputs: string[] = [];
		let data = (output as vscode.CellDisplayOutput).data;
		let trimmedData: { [key: string]: any } = {};
		trimmedData[mimeType] = data[mimeType];

		renderOutputs.push(`
			<script type="application/vnd.nteract.view+json">
				${JSON.stringify(trimmedData)}
			</script>
			<script> if (window.nteract) { window.nteract.renderTags(); } </script>
		`);

		return renderOutputs.join('\n');
	}
}