/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

type CssRules = { [key: string]: string | number };

class DecoratorUtils {
    public static stringifyCssProperties(rules: CssRules): string {
        return Object.keys(rules)
            .map((rule) => {
                return `${rule}: ${rules[rule]};`;
            })
            .join(' ');
    }
};

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.notebook.registerNotebookContentProvider(
            "notebookEditing", new SampleProvider()
        )
    );

    const topValue = -1;
    const nameTagCssRules: CssRules = {
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

    let activeEditorDisposable: vscode.Disposable | undefined = undefined;

    context.subscriptions.push(vscode.notebook.onDidChangeActiveNotebookEditor(() => {
        activeEditorDisposable?.dispose();
        const activeEditor = vscode.notebook.activeNotebookEditor;
        if (activeEditor) {
            activeEditorDisposable = vscode.notebook.onDidChangeNotebookEditorSelection(e => {
                if (e.notebookEditor === activeEditor) {
                    const selection = activeEditor.selection;

                    if (selection) {
                        activeEditor.setDecorations(decorationType, { start: selection.index, end: selection.index + 1 });
                    }
                }
            });


            if (activeEditor.selection) {
                activeEditor.setDecorations(decorationType, { start: activeEditor.selection.index, end: activeEditor.selection.index + 1 });
            }
        }
    }));

    context.subscriptions.push(decorationType);
}

class SampleProvider implements vscode.NotebookContentProvider {
    async openNotebook(uri: vscode.Uri): Promise<vscode.NotebookData> {
        let cells = [];
        let metadata: vscode.NotebookDocumentMetadata = {};
        try {
            const raw = (await vscode.workspace.fs.readFile(uri)).toString();
            const content = JSON.parse(raw);
            metadata = { custom: content.metadata };
            cells = content.cells.map((cell: any) => {
                if (cell.cellKind === 'markdown') {
                    return {
                        cellKind: vscode.CellKind.Markdown,
                        source: cell.source,
                        language: 'markdown',
                        outputs: [],
                        metadata: {}
                    };
                } else {
                    return {
                        cellKind: vscode.CellKind.Code,
                        source: cell.source,
                        language: content.metadata?.language_info?.name || 'python',
                        outputs: [/* not implemented */],
                        metadata: {}
                    };
                }
            });
        } catch (_e) {
            console.log(_e);
        }

        return {
            languages: ['*'],
            metadata,
            cells
        };
    }

    // The following are dummy implementations not relevant to this example.
    onDidChangeNotebook = new vscode.EventEmitter<vscode.NotebookDocumentEditEvent>().event;
    async resolveNotebook(): Promise<void> { }
    async saveNotebook(document: vscode.NotebookDocument): Promise<void> {
        const data = {
            metadata: {},
            cells: document.cells.map(cell => ({
                cellKind: cell.cellKind === vscode.CellKind.Code ? 'code' : 'markdown',
                source: cell.document.getText(),
                language: cell.document.languageId,
                outputs: [/* not implemented */],
                metadata: {}
            }))
        };

        await vscode.workspace.fs.writeFile(document.uri, Buffer.from(JSON.stringify(data)));
    }
    async saveNotebookAs(): Promise<void> { }
    async backupNotebook(): Promise<vscode.NotebookDocumentBackup> { return { id: '', delete: () => { } }; }
}