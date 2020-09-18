# Notebook Editing

### Decoration API

![Name Tag](https://github.com/microsoft/notebook-extension-samples/blob/master/notebook-editing/images/nametag.png)

### Dynamic notebook content provider registration and file opening

* Create a file `test.notebook`
* Run command `notebook.editing.openWithNotebook`
  * it will register notebook content provider on the fly
  * it will then open the document with newly registered view type

```ts
vscode.commands.registerCommand('notebook.editing.openWithNotebook', () => {
    vscode.notebook.registerNotebookContentProvider(
        "notebookEditing",
        new SampleProvider(),
        {
            transientOutputs: false, transientMetadata: {}, viewOptions: {
                displayName: 'Notebook Editing',
                filenamePattern: '*.notebook',
                exclusive: true,
            }
        }
    );

    vscode.commands.executeCommand('vscode.openWith', activeDocument.uri, 'notebookEditing');
}
```

### Register mirror content provider

```ts
const staticContentProviders: { viewType: string, displayName: string, priority: 'option' | 'default', selector: { filenamePattern: string, excludeFileNamePattern?: string }[] }[]
    = vscode.extensions.all.map(a => a.packageJSON.contributes?.notebookProvider || []).reduce((acc, val) => acc.concat(val), []);

staticContentProviders.forEach(provider => {
    context.subscriptions.push(vscode.notebook.registerNotebookContentProvider(`vsls-${provider.viewType}`, new SampleProvider(), {
        transientOutputs: false,
        transientMetadata: {},
        viewOptions: {
            displayName: provider.displayName,
            filenamePattern: provider.selector[0].excludeFileNamePattern ? { include: provider.selector[0].filenamePattern, exclude: provider.selector[0].excludeFileNamePattern } : provider.selector[0].filenamePattern,
            exclusive: true,
        }
    }));
});
```