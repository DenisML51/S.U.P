import React from 'react';

interface State {
  error: Error | null;
}

/**
 * Catches render errors so a crash shows a readable, recoverable screen instead of a blank (dark)
 * page. In development it also prints the error and its stack on screen, so the cause is visible
 * without opening the console. Local data is untouched — a reload recovers.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Необработанная ошибка интерфейса:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-bg px-6 text-center max-sm:px-4">
        <div className="flex w-full min-w-0 max-w-lg flex-col items-center gap-4">
          <h1 className="ui-display text-xl text-ink">Что-то сломалось</h1>
          <p className="text-sm text-ink-muted">
            Интерфейс наткнулся на ошибку. Ваши данные сохранены на устройстве — перезагрузите страницу.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ui-button ui-button--primary ui-button--md"
          >
            Перезагрузить
          </button>
          {import.meta.env.DEV && (
            <pre className="ui-scroll max-h-56 w-full overflow-auto whitespace-pre-wrap [overflow-wrap:anywhere] border border-line bg-surface p-3 text-left text-xs text-ink-faint">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
