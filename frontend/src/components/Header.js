import React from 'react';

function Header({ sessionId, isConnected, onResetSession, onClearHistory }) {
  return (
    <header className="header">
      <div className="header__brand">
        <div className="header__logo">
          <span className="header__logo-icon">📰</span>
        </div>
        <div className="header__title">
          <h1>News Chatbot</h1>
          <p className="header__subtitle">RAG-Powered News Assistant</p>
        </div>
      </div>

      <div className="header__status">
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="connection-status__dot"></span>
          <span className="connection-status__text">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        {sessionId && (
          <span className="session-id" title={sessionId}>
            Session: {sessionId.slice(0, 8)}...
          </span>
        )}
      </div>

      <div className="header__actions">
        <button
          className="btn btn--secondary"
          onClick={onClearHistory}
          title="Clear chat history"
        >
          <span className="btn__icon">🗑️</span>
          <span className="btn__text">Clear</span>
        </button>
        
        <button
          className="btn btn--primary"
          onClick={onResetSession}
          title="Start new session"
        >
          <span className="btn__icon">🔄</span>
          <span className="btn__text">New Session</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
