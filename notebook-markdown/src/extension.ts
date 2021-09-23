import * as vscode from 'vscode';

const markdown = 'markdown'

export function activate(context: vscode.ExtensionContext) {
	console.log("Extension 'notebook-markdown' is active");

  context.subscriptions.push(vscode.notebook.registerNotebookProvider(markdown, new MarkdownProvider()));
  const markdownNotebook = vscode.commands.registerCommand('extension.showTestMarkdown', async () => {
    const file = await vscode.window.showOpenDialog({ canSelectFolders: false, canSelectFiles: true, canSelectMany: false, openLabel: 'Select Markdown file', filter: {'Markdown': ['md', 'markdown']}});
    console.log(file[0].path);
    vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(file[0].path), markdown);
  });
  context.subscriptions.push(markdownNotebook);
}

interface RawNotebookCell {
	language: string;
	value: string;
	kind: vscode.CellKind;
}


class MarkdownProvider implements vscode.NotebookProvider {
  async resolveNotebook(editor: vscode.NotebookEditor): Promise<void> {
    // TODO: populate from vscode language ids
    editor.document.languages = ['css', 'typescript', 'javascript', 'html', 'css', 'csharp', 'cpp'];
    editor.document.metadata = { editable: false, cellEditable: true, hasExecutionOrder: false };
    const contents = Buffer.from(await vscode.workspace.fs.readFile(editor.document.uri)).toString('utf8');

    await editor.edit(editBuilder => {
      try {
        const cellData = <RawNotebookCell[]>this._parseMarkdown(contents);
        for (let data of cellData)  {
          editBuilder.insert(0, data.value, data.language, data.kind, [], { editable: true, runnable: false });
        }
      } catch (err) {
        console.error(err);
      }
    });
  }

  /**
   * Converts partial or shortened code names into the full length for markdown parsing by Notebook
   * @param str The language to convert
   */
  private _convertLang(str: string): string {
    switch (str) {
      case "js":
        return "javascript";
      case "cs":
        return "csharp";
      case "py":
      case "py2":
      case "py3":
        return "python";
      default:
        return str;
    }
  }

  /**
   * TODO: use markdownit to parse the string
   * Parses the Markdown file into a RawNotebookCell array
   * @param content The Markdown string to parse
   */
  private _parseMarkdown(content: string): RawNotebookCell[] {
    const lines = content.split('\n');
    let cells = [];
    for (let i = 0; i < lines.length; i++)
    {
      // Some validation
      lines[i].trim();
      if (lines[i].trim().length === 0) {
        continue;
      }

      if (lines[i].startsWith("```")) {
        const l = lines[i].substring(3)
        const lang = this._convertLang(l);
        const kind = vscode.CellKind.Code;
        let code = "";
        i++;
        let currLine = lines[i];
        while (!currLine.startsWith("```")) {
          code += (currLine + '\n');
          i++;
          currLine = lines[i];
        }
        cells.push({language: lang, value: code, kind: kind});
      } else if (lines[i].startsWith("#")) {
        cells.push({language: markdown, value: lines[i], kind: vscode.CellKind.Markdown});
      } else {
        const lang = markdown;
        const kind = vscode.CellKind.Markdown;
        let md = lines[i] + '\n';
        i++;
        let currLine = lines[i];
        while (currLine && !currLine.startsWith('#') && !currLine.startsWith('```')) {
          md += currLine + '\n';
          i++;
          currLine = lines[i];
          md.slice(0, -1);
        }
        i--;
        cells.push({language: lang, value: md, kind: kind});
      }
    }

    return cells;
  }

  /**
   * TODO: needs work
   * Parses the NotebookDocument back into Markdown
   * @param document The NotebookDocument to parse
   */
  private _parseCellsToMd(document: vscode.NotebookDocument): string {
    let parsedString = "";
    for (let i = 0; i < document.cells.length; i++) {
      const cell = document.cells[i];
      if (cell.cellKind === vscode.CellKind.Code)
      {
        let codePrefix = "```" + cell.language + '\n';
        let codeSuffix = '\n' + "```" + '\n';

        parsedString += (codePrefix + cell.source + codeSuffix);
      } else {
        parsedString += cell.source + '\n';
      }
    }
    return parsedString;
  }

  /**
   * Noop
   * @param _document The current document
   * @param cell The current cell
   */
  async executeCell(_document: vscode.NotebookDocument): Promise<void> {
  }

  /**
   * Saves the document and writes the contents
   * @param document The current document
   */
  async save(document: vscode.NotebookDocument): Promise<boolean> {
		await vscode.workspace.fs.writeFile(document.uri, Buffer.from(this._parseCellsToMd(document)));
		return true;
  }


}

export function deactivate() {}
