import { formatDisplay } from '../logic/format.js';
import { CloseIcon, TrashIcon } from './icons.jsx';

export default function HistoryPanel({ history, overlay, onSelect, onClear, onClose }) {
  return (
    <aside className={`history${overlay ? ' history--overlay' : ''}`} aria-label="Журнал" data-testid="history">
      <div className="history__header">
        <h2 className="history__title">Журнал</h2>
        {overlay && (
          <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть журнал">
            <CloseIcon />
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="history__empty">Журнал пока пуст</p>
      ) : (
        <ul className="history__list">
          {history.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="history__item"
                data-testid="history-item"
                onClick={() => onSelect(item.id)}
              >
                <span className="history__expression">{item.expression}</span>
                <span className="history__result">{formatDisplay(item.result)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="history__footer">
        <button
          type="button"
          className="icon-button"
          onClick={onClear}
          disabled={history.length === 0}
          aria-label="Очистить журнал"
          title="Очистить журнал"
          data-testid="btn-history-clear"
        >
          <TrashIcon />
        </button>
      </div>
    </aside>
  );
}
