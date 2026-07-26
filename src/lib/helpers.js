// Handlebars helpers registered on the view engine in src/app.js. Keep each
// helper in its own module (or grouped here while small) so every branch can
// be unit tested directly — see tests/lib/helpers.test.js.
const number3 = (n) => (typeof n === 'number' && !Number.isNaN(n) ? n.toFixed(3) : '-');

module.exports = { number3 };
