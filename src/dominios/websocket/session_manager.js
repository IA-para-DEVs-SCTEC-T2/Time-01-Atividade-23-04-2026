/**
 * Gerenciador de sessões WebSocket ativas.
 * Mantém um mapa em memória de session_id → WebSocket.
 */
function criar_session_manager() {
  const sessoes = new Map();

  function adicionar(session_id, socket) {
    sessoes.set(session_id, socket);
  }

  function remover(session_id) {
    sessoes.delete(session_id);
  }

  function obter(session_id) {
    return sessoes.get(session_id);
  }

  function listar_ids() {
    return Array.from(sessoes.keys());
  }

  function fechar_todas() {
    for (const socket of sessoes.values()) {
      socket.terminate();
    }
    sessoes.clear();
  }

  return { adicionar, remover, obter, listar_ids, fechar_todas };
}

module.exports = { criar_session_manager };
