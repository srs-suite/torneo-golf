/**
 * Currency utility functions
 */

const CURRENCY_SYMBOLS = {
  ARS: '$',
  USD: 'US$'
};

function formatCurrency(amount, currency = 'ARS') {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formattedAmount = parseFloat(amount || 0).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${symbol} ${formattedAmount}`;
}

function parseCurrency(value) {
  // Remove currency symbols, spaces, and parse as float
  return parseFloat(value.toString().replace(/[^0-9.-]+/g, '')) || 0;
}

module.exports = {
  formatCurrency,
  parseCurrency,
  CURRENCY_SYMBOLS
};

