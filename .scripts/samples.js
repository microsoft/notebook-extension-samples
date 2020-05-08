//@ts-check

/**
 * @typedef {Object} Sample
 * @property {string} description - A readable name for the sample
 * @property {string} path - Path to the sample's root
 */

/** @type {Sample[]} */
const samples = [
    {
        description: 'Notebook Document Provider',
        path: 'notebook-provider'
    },
    {
        description: 'Notebook Renderers',
        path: 'notebook-renderer'
    },
    {
        description: 'Notebook Regexper',
        path: 'notebook-regexper'
    },
    {
        description: 'Notebook Markdown',
        path: 'notebook-markdown'
    }
]

module.exports = {
    samples
}
