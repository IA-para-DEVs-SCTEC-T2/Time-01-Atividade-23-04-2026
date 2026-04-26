const { randomUUID } = require('crypto');

/**
 * Gera um UUID v4 usando o módulo crypto nativo do Node.js v22.
 * @returns {string} UUID v4 no formato xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
function gerar_uuid_v4() {
  return randomUUID();
}

module.exports = { gerar_uuid_v4 };
