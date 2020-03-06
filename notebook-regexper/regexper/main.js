// This file contains code to start up pages on the site, and other code that
// is not directly related to parsing and display of regular expressions.
//
// Since the code in this is executed immediately, it is all but impossible to
// test. Therefore, this code is kept as simple as possible to reduce the need
// to run it through automated tests.

import Parser from './parser/javascript.js';

(function () {
  window.renderRegexp = async function renderExpression(element, value) {
    const parser = new Parser(element, { keepContent: true });
    await parser.parse(value);
    await parser.render();
  }
  window.dispatchEvent(new Event('regexpReady'));
})()

