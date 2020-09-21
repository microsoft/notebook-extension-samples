/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { LiveShare, SharedService, SharedServiceProxy } from 'vsls';
type CssRules = { [key: string]: string | number; };

class DecoratorUtils {
	public static stringifyCssProperties(rules: CssRules): string {
		return Object.keys(rules)
			.map((rule) => {
				return `${rule}: ${rules[rule]};`;
			})
			.join(' ');
	}
};
/**
 * Should be removed once we fix the webpack bundling issue.
 */
async function getVSLSApi() {
	const liveshareExtension = vscode.extensions.getExtension('ms-vsliveshare.vsliveshare');
	if (!liveshareExtension) {
		// The extension is not installed.
		return null;
	}
	const extensionApi = liveshareExtension.isActive ?
		liveshareExtension.exports : await liveshareExtension.activate();
	if (!extensionApi) {
		// The extensibility API is not enabled.
		return null;
	}
	const liveShareApiVersion = '1.0.2594';
	// Support deprecated function name to preserve compatibility with older versions of VSLS.
	if (!extensionApi.getApi) {
		return extensionApi.getApiAsync(liveShareApiVersion);
	}
	return extensionApi.getApi(liveShareApiVersion);
}

export class LiveShareManager implements vscode.Disposable {
	private _liveShareAPI?: LiveShare;
	private _host?: VSLSHost;
	private _guest?: VSLSGuest;
	private _localDisposables: vscode.Disposable[];
	private _globalDisposables: vscode.Disposable[];

	constructor() {
		this._localDisposables = [];
		this._globalDisposables = [];
	}

	public async initialize(): Promise<LiveShare | undefined> {
		if (!this._liveShareAPI) {
			this._liveShareAPI = await getVSLSApi();
		}

		if (!this._liveShareAPI) {
			return;
		}

		this._globalDisposables.push(this._liveShareAPI.onDidChangeSession(e => this._onDidChangeSession(e.session), this));
		if (this._liveShareAPI!.session) {
			this._onDidChangeSession(this._liveShareAPI!.session);
		}

		return this._liveShareAPI;
	}


	private async _onDidChangeSession(session: any) {
		this._localDisposables.forEach(disposable => disposable.dispose());

		if (session.role === 1 /* Role.Host */) {
			this._host = new VSLSHost(this._liveShareAPI!);
			this._localDisposables.push(this._host);
			await this._host.initialize();
			return;
		}

		if (session.role === 2 /* Role.Guest */) {
			this._guest = new VSLSGuest(this._liveShareAPI!);
			this._localDisposables.push(this._guest);
			await this._guest.initialize();
		}
	}

	dispose() {

	}
}

const VSLS_GH_NB_SESSION_NAME = 'ghnb-vsls';
const VSLS_GUEST_INITIALIZE = 'ghnb-vsls-initialize';
const VSLS_GH_NB_CHANGE_ACTIVE_DOCUMENT = 'ghnb-vsls-activeDocument';
const VSLS_GH_NB_CHANGE_ACTIVE_EDITOR_SELECTION = 'ghnb-vsls-activeEditorSelection';
const VSLS_OPEN_NOTEBOOK = 'ghnb-vsls-openNotebook';
const VSLS_SAVE_NOTEBOOK = 'ghnb-vsls-saveNotebook';
const VSLS_SAVE_NOTEBOOK_AS = 'ghnb-vsls-saveNotebookAs';
const VSLS_BACKUP_NOTEBOOK = 'ghnb-vsls-backupNotebook';

const VSLS_KERNEL_EXECUTE_CELL = 'ghnb-vsls-executeCell';
const VSLS_KERNEL_CANCEL_EXECUTE_CELL = 'ghnb-vsls-cancelExecuteCell';
const VSLS_KERNEL_EXECUTE_DOCUMENT = 'ghnb-vsls-executeDocument';
const VSLS_KERNEL_CANCEL_EXECUTE_DOCUMENT = 'ghnb-vsls-cancelExecuteDocument';

class GuestContentProvider implements vscode.NotebookContentProvider {
	constructor(readonly originalViewType: string, readonly proxy: SharedServiceProxy) {

	}
	async openNotebook(uri: vscode.Uri, openContext: vscode.NotebookDocumentOpenContext): Promise<vscode.NotebookData> {
		const data = await this.proxy.request(VSLS_OPEN_NOTEBOOK, [this.originalViewType, uri, openContext]);
		if (data) {
			return data;
		}

		throw ('loading failed');
	}

	async resolveNotebook(_document: vscode.NotebookDocument, _webview: vscode.NotebookCommunication): Promise<void> {
		// ?
		return;
	}

	async saveNotebook(document: vscode.NotebookDocument, _cancellation: vscode.CancellationToken): Promise<void> {
		await this.proxy.request(VSLS_SAVE_NOTEBOOK, [this.originalViewType, document.uri]);
	}
	async saveNotebookAs(targetResource: vscode.Uri, document: vscode.NotebookDocument, _cancellation: vscode.CancellationToken): Promise<void> {
		await this.proxy.request(VSLS_SAVE_NOTEBOOK_AS, [this.originalViewType, targetResource, document.uri]);
	}
	onDidChangeNotebook = new vscode.EventEmitter<vscode.NotebookDocumentContentChangeEvent | vscode.NotebookDocumentEditEvent>().event;

	async backupNotebook(document: vscode.NotebookDocument, context: vscode.NotebookDocumentBackupContext, _cancellation: vscode.CancellationToken): Promise<vscode.NotebookDocumentBackup> {
		const data = await this.proxy.request(VSLS_BACKUP_NOTEBOOK, [this.originalViewType, document.uri, context]);

		return {
			id: data.id,
			delete: () => {

			}
		};
	}

}

class GuestKernel implements vscode.NotebookKernel {
	label: string = 'Live Share Kernel from Host';
	description?: string | undefined;
	detail?: string | undefined;
	isPreferred: boolean = true;

	constructor(readonly originalViewType: string, readonly id: string, readonly proxy: SharedServiceProxy) {
	}

	executeCell(document: vscode.NotebookDocument, cell: vscode.NotebookCell): void {
		this.proxy.request(VSLS_KERNEL_EXECUTE_CELL, [this.originalViewType, document.uri, cell.uri, cell.index]);
	}

	cancelCellExecution(document: vscode.NotebookDocument, cell: vscode.NotebookCell): void {
		this.proxy.request(VSLS_KERNEL_CANCEL_EXECUTE_CELL, [this.originalViewType, document.uri, cell.uri, cell.index]);
	}

	executeAllCells(document: vscode.NotebookDocument): void {
		this.proxy.request(VSLS_KERNEL_EXECUTE_DOCUMENT, [this.originalViewType, document.uri]);
	}

	cancelAllCellsExecution(document: vscode.NotebookDocument): void {
		this.proxy.request(VSLS_KERNEL_CANCEL_EXECUTE_DOCUMENT, [this.originalViewType, document.uri]);
	}
}

class GuestKernelProvider implements vscode.NotebookKernelProvider {
	private _mirrorKernel: GuestKernel;
	constructor(readonly originalViewType: string, readonly proxy: SharedServiceProxy) {
		this._mirrorKernel = new GuestKernel(originalViewType, `vsls-${originalViewType}-kernel`, proxy);
	}

	provideKernels(_document: vscode.NotebookDocument, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.NotebookKernel[]> {
		return [this._mirrorKernel];
	}
}

export class VSLSGuest implements vscode.Disposable {
	private _sharedServiceProxy?: SharedServiceProxy;
	private _disposables: vscode.Disposable[] = [];
	private _viewTypeToContentProvider = new Map<string, vscode.Disposable>();
	private _viewTypeToKernelProvider = new Map<string, vscode.Disposable>();

	constructor(private _liveShareAPI: LiveShare) {

	}

	public async initialize() {
		this._sharedServiceProxy = await this._liveShareAPI.getSharedService(VSLS_GH_NB_SESSION_NAME) || undefined;

		if (!this._sharedServiceProxy) {
			return;
		}

		const hostContentProviders = await this._sharedServiceProxy.request(VSLS_GUEST_INITIALIZE, []);


		hostContentProviders.forEach((provider: { viewType: string, displayName: string, priority: 'option' | 'default',  selector: { filenamePattern: string, excludeFileNamePattern?: string }[] }) => {
			const mirrorViewType = `vsls-${provider.viewType}`;

			this._viewTypeToContentProvider.set(provider.viewType, vscode.notebook.registerNotebookContentProvider(
				mirrorViewType,
				new GuestContentProvider(provider.viewType, this._sharedServiceProxy!),
				{
					transientOutputs: false, transientMetadata: {}, viewOptions: {
						displayName: `Live Share - ${provider.displayName}`,
						filenamePattern: provider.selector.map(selector => selector.excludeFileNamePattern ? { include: selector.filenamePattern, exclude: selector.excludeFileNamePattern } : selector.filenamePattern ),
						exclusive: true
					}
				}
			));

			this._viewTypeToKernelProvider.set(provider.viewType, vscode.notebook.registerNotebookKernelProvider({ viewType: mirrorViewType }, new GuestKernelProvider(provider.viewType, this._sharedServiceProxy!)))
		});

		this._sharedServiceProxy.onNotify(VSLS_GH_NB_CHANGE_ACTIVE_DOCUMENT, (args: { uriComponents?: vscode.Uri, viewType?: string; }) => {
			if (!args.uriComponents || !args.viewType) {
				return;
			}

			let uri = vscode.Uri.parse(args.uriComponents.path);
			uri = uri.with({
				scheme: args.uriComponents.scheme,
				authority: args.uriComponents.authority,
				fragment: args.uriComponents.fragment,
				path: args.uriComponents.path,
				query: args.uriComponents.query
			});

			vscode.commands.executeCommand('vscode.openWith', uri, `vsls-${args.viewType}`);
		});


		const topValue = -1;
		const nameTagCssRules = {
			position: 'absolute',
			top: `${topValue}rem`,
			'border-top-left-radius': '0.15rem',
			'border-top-right-radius': '0.15rem',
			padding: '0px 0.5ch',
			display: 'inline-block',
			'pointer-events': 'none',
			color: '#fff',
			'font-size': '0.7rem',
			'z-index': 1,
			'font-weight': 'bold'
		};
		const stringifiedNameTagCss = DecoratorUtils.stringifyCssProperties(nameTagCssRules);
		const decorationType = vscode.notebook.createNotebookEditorDecorationType({
			top: {
				contentText: 'Peng Lyu',
				backgroundColor: '#f0f',
				textDecoration: `none; ${stringifiedNameTagCss}`
			},
			backgroundColor: '#0ff',
			borderColor: '#f0f'
		});
		this._sharedServiceProxy.onNotify(VSLS_GH_NB_CHANGE_ACTIVE_EDITOR_SELECTION, (args: any) => {
			if (!args.uriComponents || !args.viewType || !args.range) {
				return;
			}

			let uri = vscode.Uri.parse(args.uriComponents.path);
			uri = uri.with({
				scheme: args.uriComponents.scheme,
				authority: args.uriComponents.authority,
				fragment: args.uriComponents.fragment,
				path: args.uriComponents.path,
				query: args.uriComponents.query
			});

			const range = args.range;
			const activeEditor = vscode.notebook.visibleNotebookEditors.find(editor => editor.document.uri.toString() === uri.toString());
			activeEditor?.setDecorations(decorationType, range);

			return;
		});
	}

	dispose() {
		this._disposables.forEach(d => d.dispose());
		this._sharedServiceProxy = undefined;
		this._disposables = [];
	}

}

export class VSLSHost implements vscode.Disposable {
	private _sharedService: SharedService | null = null;
	private _disposables: vscode.Disposable[] = [];

	private _localContentProviders: { viewType: string, displayName: string, priority: 'option' | 'default',  selector: { filenamePattern: string, excludeFileNamePattern?: string }[]}[];

	constructor(private _liveShareAPI: LiveShare) {
		this._localContentProviders = vscode.extensions.all.map(a => a.packageJSON.contributes?.notebookProvider || []).reduce((acc, val) => acc.concat(val), []);
	}

	public async initialize() {
		this._sharedService = await this._liveShareAPI!.shareService(VSLS_GH_NB_SESSION_NAME);

		if (!this._sharedService) {
			// this._sharedService.onRequest(VSLS_REQUEST_NAME, this._gitHandler.bind(this));
			return;
		}

		let activeEditorDisposable: vscode.Disposable | undefined = undefined;

		this._disposables.push(vscode.notebook.onDidChangeActiveNotebookEditor(() => {
			const activeEditor = vscode.notebook.activeNotebookEditor;
			vscode.window.showInformationMessage(VSLS_GH_NB_CHANGE_ACTIVE_DOCUMENT, 'NOTIFY');
			this._sharedService?.notify(VSLS_GH_NB_CHANGE_ACTIVE_DOCUMENT, {
				uriComponents: activeEditor?.document.uri ? this._liveShareAPI.convertLocalUriToShared(activeEditor!.document.uri) : undefined,
				viewType: activeEditor?.document.viewType
			});

			activeEditorDisposable?.dispose();

			if (activeEditor) {
				const selection = activeEditor?.selection;
				if (selection) {
					this._sharedService?.notify(VSLS_GH_NB_CHANGE_ACTIVE_EDITOR_SELECTION, {
						uriComponents: this._liveShareAPI.convertLocalUriToShared(activeEditor!.document.uri),
						viewType: activeEditor.document.viewType,
						range: { start: selection.index, end: selection.index + 1 }
					});
				}

				activeEditorDisposable = vscode.notebook.onDidChangeNotebookEditorSelection(e => {
					if (e.notebookEditor === activeEditor) {
						const selection = activeEditor?.selection;
						if (selection) {
							this._sharedService?.notify(VSLS_GH_NB_CHANGE_ACTIVE_EDITOR_SELECTION, {
								uriComponents: this._liveShareAPI.convertLocalUriToShared(activeEditor!.document.uri),
								viewType: activeEditor.document.viewType,
								range: { start: selection.index, end: selection.index + 1 }
							});
						}
					}
				});
			}

		}));

		this._sharedService.onRequest(VSLS_GUEST_INITIALIZE, () => {
			return this._localContentProviders;
		});

		this._sharedService.onRequest(VSLS_OPEN_NOTEBOOK, async (args: any[]) => {
			const viewType = args[0];
			const uriComponents = args[1];
			const localUri = this._convertToLocalUri(uriComponents);

			const existingDocument = vscode.notebook.notebookDocuments.find(document => document.viewType === viewType && document.uri.toString() === localUri.toString());
			if (existingDocument) {
				const notebookData: vscode.NotebookData = {
					languages: existingDocument.languages,
					metadata: existingDocument.metadata,
					cells: existingDocument.cells.map(cell => ({
						cellKind: cell.cellKind,
						language: cell.language,
						metadata: cell.metadata,
						outputs: cell.outputs,
						source: cell.document.getText()
					}))
				};

				return notebookData;
			}

			await vscode.commands.executeCommand('vscode.openWith', localUri, viewType);
			const document = vscode.notebook.activeNotebookEditor?.document;

			if (document) {
				return {
					languages: document.languages,
					metadata: document.metadata,
					cells: document.cells.map(cell => ({
						cellKind: cell.cellKind,
						language: cell.language,
						metadata: cell.metadata,
						outputs: cell.outputs,
						source: cell.document.getText()
					}))
				};
			}
			return undefined;
		});

		this._sharedService.onRequest(VSLS_KERNEL_EXECUTE_CELL, async (args: any[]) => {
			const cellIndex = args[3];

			// TODO focus the right editor and cell
			await vscode.commands.executeCommand('notebook.cell.execute', { start: cellIndex, end: cellIndex + 1 });
		});

		this._sharedService.onRequest(VSLS_KERNEL_CANCEL_EXECUTE_CELL, async (args: any[]) => {
			const cellIndex = args[3];

			// TODO focus the right editor and cell
			await vscode.commands.executeCommand('notebook.cell.cancelExecution', { start: cellIndex, end: cellIndex + 1 });
		});
	}

	private _convertToLocalUri(uriComponents: vscode.Uri) {
		let uri = vscode.Uri.file(uriComponents.path);
		uri = uri.with({
			scheme: uriComponents.scheme,
			path: uriComponents.path,
			authority: uriComponents.authority,
			fragment: uriComponents.fragment,
			query: uriComponents.query
		});

		const localUri = this._liveShareAPI.convertSharedUriToLocal(uri);
		return localUri;
	}

	dispose() {
		this._disposables.forEach(d => d.dispose());
		this._sharedService = null;
		this._disposables = [];
	}
}