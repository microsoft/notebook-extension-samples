/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { LiveShareManager } from './vsls';

export async function activate(context: vscode.ExtensionContext) {
    const liveShareManager = new LiveShareManager();
	context.subscriptions.push(liveShareManager);
	liveShareManager.initialize();
}
