/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as path from 'path';

declare var TextEncoder: any;
declare var TextDecoder: any;

interface CellStreamOutput {
	output_type: 'stream';
	text: string;
}

interface CellErrorOutput {
	output_type: 'error';
	/**
	 * Exception Name
	 */
	ename: string;
	/**
	 * Exception Value
	 */
	evalue: string;
	/**
	 * Exception call stack
	 */
	traceback: string[];
}

interface CellDisplayOutput {
	output_type: 'display_data' | 'execute_result';
	data: { [key: string]: any };
}

export type RawCellOutput = CellStreamOutput | CellErrorOutput | CellDisplayOutput;

export interface RawCell {
	cell_type: 'markdown' | 'code';
	outputs?: RawCellOutput[];
	source: string[];
	metadata: any;
	execution_count?: number;
}

export class Cell {
	public outputs: vscode.NotebookCellOutput[] = [];

	constructor(
		public source: string[],
		public cell_type: 'markdown' | 'code',
		private _outputs: vscode.NotebookCellOutput[]
	) {

	}

	containHTML() {
		return this._outputs && this._outputs.find(op => op.items.find(opi => opi.mime === 'text/html'));
	}

	insertDependencies(dependency: vscode.NotebookCellOutput) {
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

function transformOutputToCore(rawOutput: RawCellOutput): vscode.NotebookCellOutput {
	if (rawOutput.output_type === 'execute_result' || rawOutput.output_type === 'display_data') {
		const items: vscode.NotebookCellOutputItem[] = [];
		for (const key in rawOutput.data) {
			items.push(new vscode.NotebookCellOutputItem(rawOutput.data[key], key));
		}
		return new vscode.NotebookCellOutput(items)
	} else if (rawOutput.output_type === 'stream') {
		return new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stdout(Array.isArray(rawOutput.text) ? rawOutput.text.join('') : rawOutput.text)]);
	} else {
		return new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.error({
			name: (<CellErrorOutput>rawOutput).ename,
			message: (<CellErrorOutput>rawOutput).evalue,
			stack: (<CellErrorOutput>rawOutput).traceback.join('\n')
		})]);
	}
}

function transformOutputFromCore(output: vscode.NotebookCellOutput): RawCellOutput {
	if (output.items.find(op => op.mime === 'application/x.notebook.stream')) {
		return {
			output_type: 'stream',
			text: new TextDecoder().decode(output.items.find(op => op.mime === 'application/x.notebook.stream')?.data)
		}
	} else 	if (output.items.find(op => op.mime === 'application/x.notebook.error-traceback')) {
		const item = output.items.find(op => op.mime === 'application/x.notebook.error-traceback');
		return {
			output_type: 'error',
			ename: (item as any).ename,
			evalue: (item as any).evalue,
			traceback: (item as any).traceback
		}
	} else {
		let data: { [key: string]: unknown } = {};

		output.items.forEach(op => {
			data[op.mime] = data.value
		})
		return {
			output_type: 'display_data',
			data: data
		};
	}
}

export class JupyterNotebook {
	public mapping: Map<number, any> = new Map();
	private preloadScript = false;
	private displayOrders = [
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
	private nextExecutionOrder = 0;

	constructor(
		private _extensionPath: string,
		public notebookJSON: any,
		private fillOutputs: boolean
	) {}

	resolve(): vscode.NotebookData {
		return {
			metadata: {
				editable: this.notebookJSON?.metadata?.editable === undefined ? true : this.notebookJSON?.metadata?.editable,
				runnable: this.notebookJSON?.metadata?.runnable === undefined ? true : this.notebookJSON?.metadata?.runnable,
				cellEditable: this.notebookJSON?.metadata?.cellEditable === undefined ? true : this.notebookJSON?.metadata?.cellEditable,
				cellRunnable: this.notebookJSON?.metadata?.cellRunnable === undefined ? true : this.notebookJSON?.metadata?.cellRunnable,
				displayOrder: this.displayOrders,
			},
			cells: this.notebookJSON.cells.map(((raw_cell: RawCell) => {
				let outputs: vscode.NotebookCellOutput[] = [];
				if (this.fillOutputs) {
					outputs = raw_cell.outputs?.map(rawOutput => transformOutputToCore(rawOutput)) || [];
				}

				const executionOrder = typeof raw_cell.execution_count === 'number' ? raw_cell.execution_count : undefined;
				if (typeof executionOrder === 'number') {
					if (executionOrder >= this.nextExecutionOrder) {
						this.nextExecutionOrder = executionOrder + 1;
					}
				}

				const cellEditable = raw_cell.metadata?.editable;
				const runnable = raw_cell.metadata?.runnable;
				const metadata = { editable: cellEditable, runnable: runnable, executionOrder };

				return {
					source: raw_cell.source ? (Array.isArray(raw_cell.source) ? raw_cell.source.join('') : raw_cell.source) : '',
					language: this.notebookJSON?.metadata?.language_info?.name || 'python',
					cellKind: raw_cell.cell_type === 'code' ? vscode.NotebookCellKind.Code : vscode.NotebookCellKind.Markup,
					outputs: outputs,
					metadata
				};
			}))
		}
	}

	private getNextExecutionOrder(): number {
		return this.nextExecutionOrder++;
	}

	async execute(document: vscode.NotebookDocument, controller: vscode.NotebookController) {

		if (!this.fillOutputs) {
			document.getCells().forEach(async (cell, i) => {
				const execution = controller.createNotebookCellExecution(cell);
				execution.executionOrder = this.getNextExecutionOrder();
				execution.start(Date.now())

				let rawCell: RawCell = this.notebookJSON.cells[i];

				if (!this.preloadScript) {
					let containHTML = this.containHTML(rawCell);
					if (containHTML) {
						this.preloadScript = true;
						const scriptPathOnDisk = vscode.Uri.file(
							path.join(this._extensionPath, 'dist', 'ipywidgets.js')
						);

						let scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-webview-resource' });

						rawCell.outputs?.unshift(
							{
								'output_type': 'display_data',
								'data': {
									'text/html': [
										`<script src="${scriptUri}"></script>\n`,
									]
								}
							}
						);
					}
				}

				execution.replaceOutput(rawCell.outputs?.map(rawOutput => transformOutputToCore(rawOutput)) || []);
				execution.end(true, Date.now());
			})

			this.fillOutputs = true;
		}
	}

	containHTML(rawCell: RawCell) {
		return rawCell.outputs && rawCell.outputs.some((output: any) => {
			if (output.output_type === 'display_data' && output.data['text/html']) {
				return true;
			}

			return false;
		});
	}
}

// For test
const DELAY_EXECUTION = true;

export class NotebookProvider implements vscode.NotebookContentProvider {
	private _notebooks: Map<string, JupyterNotebook> = new Map();
	onDidChange: vscode.Event<void> = new vscode.EventEmitter<void>().event;
	label: string = 'Jupyter';
	isPreferred: boolean = true;

	private readonly _controller: vscode.NotebookController;

	constructor(viewType: string, private _extensionPath: string, private fillOutputs: boolean) {
		const emitter = new vscode.EventEmitter<vscode.NotebookDocument | undefined>();

		this._controller = vscode.notebooks.createNotebookController(viewType,viewType, "Jupyter")
		this._controller.executeHandler = this._executeAll.bind(this);

		setTimeout(() => {
			emitter.fire(undefined);
		}, 5000);
	}

	async openNotebook(uri: vscode.Uri, context: vscode.NotebookDocumentOpenContext): Promise<vscode.NotebookData> {
		let actualUri = context.backupId ? vscode.Uri.parse(context.backupId) : uri;

		try {
			let json;
			try {
				let content = await vscode.workspace.fs.readFile(actualUri);
				json = JSON.parse(content.toString());
			} catch {
				json = {
					cells: [{
						cell_type: 'markdown',
						source: [
							'# header'
						]
					}]
				};
			}
			let jupyterNotebook = new JupyterNotebook(this._extensionPath, json, this.fillOutputs);
			this._notebooks.set(uri.toString(), jupyterNotebook);
			return jupyterNotebook.resolve();
		} catch {
			throw new Error('Fail to load the document');
		}
	}

	async saveNotebook(_document: vscode.NotebookDocument, _token: vscode.CancellationToken): Promise<void> {
		return this._save(_document, _document.uri, _token);
	}

	saveNotebookAs(targetResource: vscode.Uri, document: vscode.NotebookDocument, token: vscode.CancellationToken): Promise<void> {
		return this._save(document, targetResource, token);
	}

	async _save(document: vscode.NotebookDocument, targetResource: vscode.Uri, _token: vscode.CancellationToken): Promise<void> {
		let cells: RawCell[] = [];

		document.getCells().forEach(cell => {
			let lines = cell.document.getText().split(/\r|\n|\r\n/g);
			let source = lines.map((value, index) => {
				if (index !== lines.length - 1) {
					return value + '\n';
				} else {
					return value;
				}
			});

			if(cell.kind === vscode.NotebookCellKind.Markup) {
				cells.push({
					source: source,
					metadata: {
						language_info: {
							name: cell.document.languageId || 'markdown'
						}
					},
					cell_type: 'markdown'
				});
			} else {
				cells.push({
					source: source,
					metadata: {
						language_info: {
							name: cell.document.languageId || 'markdown'
						}
					},
					cell_type: 'code',
					outputs: cell.outputs.map(output => transformOutputFromCore(output)),
					execution_count: cell.metadata?.executionOrder
				});
			}
		})

		let raw = this._notebooks.get(document.uri.toString());

		if (raw) {
			raw.notebookJSON.cells = cells;
			let content = JSON.stringify(raw.notebookJSON, null, 4);
			await vscode.workspace.fs.writeFile(targetResource, new TextEncoder().encode(content));
		} else {
			let content = JSON.stringify({ cells: cells }, null, 4);
			await vscode.workspace.fs.writeFile(targetResource, new TextEncoder().encode(content));
		}

		return;
	}

	private _executeAll(_cells: vscode.NotebookCell[], notebook: vscode.NotebookDocument, controller: vscode.NotebookController): void {
		this._doExecution(notebook, controller)
	}

	private async _doExecution(document: vscode.NotebookDocument, controller: vscode.NotebookController): Promise<void> {
		if (DELAY_EXECUTION) {
			return this._executeCellDelayed(document, controller);
		}

		const jupyterNotebook = this._notebooks.get(document.uri.toString());
		if (jupyterNotebook) {
			return jupyterNotebook.execute(document, controller);
		}
	}

	private async _executeCellDelayed(document: vscode.NotebookDocument, controller: vscode.NotebookController): Promise<void> {
		let jupyterNotebook = this._notebooks.get(document.uri.toString());
		return new Promise<void>(async resolve => {
			await new Promise(resolve => setTimeout(resolve, Math.random() * 2500));
			if (jupyterNotebook) {
				return jupyterNotebook.execute(document, controller).then(resolve);
			}
		});
	}

	async backupNotebook(document: vscode.NotebookDocument, context: vscode.NotebookDocumentBackupContext, cancellation: vscode.CancellationToken): Promise<vscode.NotebookDocumentBackup> {
		await this._save(document, context.destination, cancellation);

		return {
			id: context.destination.toString(),
			delete: () => {
				vscode.workspace.fs.delete(context.destination);
			}
		};
	}
}
