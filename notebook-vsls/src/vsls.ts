/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
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

export const VSLS_GH_NB_SESSION_NAME = 'ghnb-vsls';
export const VSLS_GH_NB_CHANGE_ACTIVE_DOCUMENT = 'ghnb-vsls-activeDocument';
export const VSLS_GH_NB_CHANGE_ACTIVE_EDITOR_SELECTION = 'ghnb-vsls-activeEditorSelection';

const VSLS_OPEN_NOTEBOOK = 'ghnb-vsls-openNotebook';
const VSLS_SAVE_NOTEBOOK = 'ghnb-vsls-saveNotebook';
const VSLS_SAVE_NOTEBOOK_AS = 'ghnb-vsls-saveNotebookAs';
const VSLS_BACKUP_NOTEBOOK = 'ghnb-vsls-backupNotebook';

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

export class VSLSGuest implements vscode.Disposable {
	private _sharedServiceProxy?: SharedServiceProxy;
	private _disposables: vscode.Disposable[] = [];
	private _viewTypeToContentProvider = new Map<string, vscode.Disposable>();

	constructor(private _liveShareAPI: LiveShare) {

	}

	public async initialize() {
		this._sharedServiceProxy = await this._liveShareAPI.getSharedService(VSLS_GH_NB_SESSION_NAME) || undefined;

		if (!this._sharedServiceProxy) {
			return;
		}

		this._sharedServiceProxy.onNotify(VSLS_GH_NB_CHANGE_ACTIVE_DOCUMENT, (args: { uriComponents?: vscode.Uri, viewType?: string; }) => {
			if (!args.uriComponents || !args.viewType) {
				return;
			}

			if (!this._viewTypeToContentProvider.has(args.viewType)) {
				// create a mirror content provider
				const ext = path.extname(args.uriComponents.path);
				this._viewTypeToContentProvider.set(args.viewType, vscode.notebook.registerNotebookContentProvider(
					`vsls-${args.viewType}`,
					new GuestContentProvider(args.viewType, this._sharedServiceProxy!),
					{
						transientOutputs: false, transientMetadata: {}, viewOptions: {
							displayName: `Live Share - ${args.viewType}`,
							filenamePattern: `*${ext}`,
							exclusive: true
						}
					}
				));
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

	constructor(private _liveShareAPI: LiveShare) {

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

		this._sharedService.onRequest(VSLS_OPEN_NOTEBOOK, (args: any[]) => {
			const viewType = args[0];
			const uriComponents = args[1];

			let uri = vscode.Uri.file(uriComponents.path);
			uri = uri.with({
				scheme: uriComponents.scheme,
				path: uriComponents.path,
				authority: uriComponents.authority,
				fragment: uriComponents.fragment,
				query: uriComponents.query
			});

			const localUri = this._liveShareAPI.convertSharedUriToLocal(uri);

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

			return undefined;
		});
	}

	dispose() {
		this._disposables.forEach(d => d.dispose());
		this._sharedService = null;
		this._disposables = [];
	}
}