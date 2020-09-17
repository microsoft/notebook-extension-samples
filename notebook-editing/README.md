# Notebook Editing

### Decoration API

![Name Tag](./images/nametag.png)

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