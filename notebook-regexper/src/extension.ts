/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as path from 'path';

//@ts-ignore
import * as parser from '../regexper/parser/javascript/parser';

export function activate(context: vscode.ExtensionContext) {

	// notebook stuff
	context.subscriptions.push(vscode.window.registerNotebookProvider('regexp', new RegexpProvider()));
	context.subscriptions.push(vscode.window.registerNotebookOutputRenderer(
		'regexp',
		{
			type: 'display_data',
			subTypes: [
				'x-application/regexp',
			]
		},
		new RegexpRenderer(context.extensionPath)
	));

	// regexp validation
	const diag = vscode.languages.createDiagnosticCollection();
	const validate = (doc: vscode.TextDocument): void => {
		if (doc.languageId !== 'regexp') {
			return;
		}
		let d: vscode.Diagnostic[] = [];
		parseRegExp(doc.getText(), d);
		diag.set(doc.uri, d)
	};
	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => validate(e.document)));
	context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(e => validate(e)));
	context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(e => {
		console.log('CLOSE', e.uri.toString());
		diag.set(e.uri, undefined)
	}));

}

class RegexpRenderer implements vscode.NotebookOutputRenderer {

	readonly preloads: vscode.Uri[];

	constructor(
		private _extensionPath: string
	) {
		this.preloads = [
			vscode.Uri.file(path.join(this._extensionPath, './regexper/dist/regexper.js')),
			//todo@joh cannot be CSS
		];
	}
	render(_document: vscode.NotebookDocument, cell: vscode.NotebookCell, output: vscode.CellOutput, _mimeType: string): string {

		if (output.outputKind !== vscode.CellOutputKind.Rich) {
			// todo@typing hole
			return '???';
		}
		const container = `cell_container_${cell.handle}`;
		const value = output.data['x-application/regexp'];

		console.log('HERE', value);

		return `
	<div id="${container}" data-value="${encodeURIComponent(value)}">
		<div class="messages" style="visibility: hidden;"></div>
		<div class="progress">
			<div>
			</div>
		</div>
		<div class="svg" style="overflow-x: scroll;">
			<svg>
			</svg>
		</div>
	</div>
	<script type="text/html" id="svg-container-base"></script>
	<script>
		new Promise(resolve => {
			if(window.renderRegexp) {
				resolve();
			} else {
				window.addEventListener('regexpReady', () => resolve());
			}
		}).then(() => {
			console.log('READY');
			const container = document.getElementById("${container}");
			const value = decodeURIComponent(container.dataset.value);
			window.renderRegexp(container, value).catch(err => {
				container.querySelector('.messages').innerText = err;
			});
		});
    </script>
    <style>
        svg {
            background-color: var(--vscode-list-inactiveSelectionBackground);
        }
        .root text,
        .root tspan {
            font: 12px Arial;
        }
        .root path {
            fill-opacity: 0;
            stroke-width: 2px;
            stroke: #000;
        }
        .root circle {
            fill: #6b6659;
            stroke-width: 2px;
            stroke: #000;
        }
        .anchor text,
        .any-character text {
            fill: #fff;
        }
        .anchor rect,
        .any-character rect {
            fill: #6b6659;
        }
        .escape text,
        .charset-escape text,
        .literal text {
            fill: #000;
        }
        .escape rect,
        .charset-escape rect {
            fill: #bada55;
        }
        .literal rect {
            fill: #dae9e5;
        }
        .charset .charset-box {
            fill: #cbcbba;
        }
        .subexp .subexp-label tspan,
        .charset .charset-label tspan,
        .match-fragment .repeat-label tspan {
            font-size: 10px;
        }
        .repeat-label {
            cursor: help;
        }
        .subexp .subexp-label tspan,
        .charset .charset-label tspan {
            dominant-baseline: text-after-edge;
        }
        .subexp .subexp-box {
            stroke: #908c83;
            stroke-dasharray: 6, 2;
            stroke-width: 2px;
            fill-opacity: 0;
        }
        .quote {
            fill: #908c83;
        }
    </style>`;
	}
}

interface RawNotebookCell {
	language: string;
	value: string;
	kind: vscode.CellKind;
}

class RegexpProvider implements vscode.NotebookProvider {

	async resolveNotebook(editor: vscode.NotebookEditor): Promise<void> {

		// confusing and hard to discover... better to add during register or return from here?
		editor.document.languages = ['regexp'];

		const contents = Buffer.from(await vscode.workspace.fs.readFile(editor.document.uri)).toString('utf8')
		let cells: vscode.NotebookCell[] = [];
		try {
			const cellData = <RawNotebookCell[]>JSON.parse(contents);
			for (let data of cellData) {
				const cell = editor.createCell(data.value, data.language, data.kind, []);
				this._setOutput(cell);
				cells.push(cell);
			}

		} catch (err) {
			console.error(contents);
			console.error(err);
		}

		if (cells.length === 0) {
			const sample = '/Hello (World|Welt)!/';
			cells.push(editor.createCell(sample, 'regexp', vscode.CellKind.Code, [{
				outputKind: vscode.CellOutputKind.Rich,
				data: {
					'x-application/regexp': sample,
				}
			}]));
		}

		editor.document.cells = cells;
	}

	async executeCell(_document: vscode.NotebookDocument, cell: vscode.NotebookCell | undefined): Promise<void> {
		if (!cell) {
			// why
			return;
		}

		this._setOutput(cell);
	}

	private _setOutput(cell: vscode.NotebookCell): void {
		if (cell.language === 'regexp') {
			const value = cell.getContent();
			if (isValid(value)) {
				cell.outputs = [{
					outputKind: vscode.CellOutputKind.Rich,
					data: {
						'x-application/regexp': value,
					}
				}];
			} else {
				cell.outputs = [{
					outputKind: vscode.CellOutputKind.Rich,
					data: {
						'text/plain': 'Invalid Regular Expression',
					}
				}];
			}
		}
	}

	async save(document: vscode.NotebookDocument): Promise<boolean> {
		let contents: RawNotebookCell[] = [];
		for (let cell of document.cells) {
			contents.push({
				kind: cell.cellKind,
				language: cell.language,
				value: cell.getContent()
			});
		}
		await vscode.workspace.fs.writeFile(document.uri, Buffer.from(JSON.stringify(contents)));
		return true;
	}
}

function isValid(value: string): boolean {
	const bucket: any[] = [];
	parseRegExp(value, bucket);
	return bucket.length === 0;
}

function parseRegExp(value: string, bucket: vscode.Diagnostic[]) {
	try {
		//@ts-ignore
		parser.default.parse(value);

	} catch (err) {
		if (err instanceof Error && err.message) {
			//parse error
			const lines = err.message.split('\n');
			const m1 = /Line (\d+): (.*)/.exec(lines[0]);
			if (m1) {
				const column = lines[lines.length - 1].indexOf('^') - 1;
				bucket.push(new vscode.Diagnostic(new vscode.Range(Number(m1[1]) - 1, column - 1, Number(m1[1]) - 1, column), m1[2]));
			}
		}
	}
}

