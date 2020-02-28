# Notebook Extension Samples

## Setup

```bash
# install dev dependencies
yarn
# install dependencies for every extension
yarn run install
# compile extensions
yarn run build
```

Launch with VS Code OSS:

```bash
# vscode and notebook-extension-samples are sibling folders
cd vscode
./scripts/code.sh --extensions-dir ../notebook-extension-samples
```