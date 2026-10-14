import { useReducer, useRef, useState } from 'react';
import { useKeyboard } from '../hooks/useKeyboard.js';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import { calculatorReducer, displayValue, initialState } from '../logic/reducer.js';
import Display from './Display.jsx';
import HistoryPanel from './HistoryPanel.jsx';
import { HistoryIcon } from './icons.jsx';
import Keypad from './Keypad.jsx';
import { KEYS_BY_ID } from './keys.js';
import MemoryBar from './MemoryBar.jsx';

export default function Calculator() {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pressed, setPressed] = useState(null);
  const pressTimer = useRef(null);
  const wide = useMediaQuery('(min-width: 760px)');
  const hasError = state.error !== null;

  // Подсвечиваем кнопку, нажатую с физической клавиатуры
  function flash(id) {
    setPressed(id);
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => setPressed(null), 130);
  }

  useKeyboard((id) => {
    const key = KEYS_BY_ID[id];
    if (hasError && key.blockedOnError) return;
    dispatch(key.action);
    flash(id);
  });

  function selectHistory(id) {
    dispatch({ type: 'historySelect', id });
    setHistoryOpen(false);
  }

  const showOverlay = !wide && historyOpen;

  return (
    <div className="calc">
      <section className="calc__main" aria-label="Калькулятор">
        <header className="calc__header">
          <h1 className="calc__title">Стандартный</h1>
          {!wide && (
            <button
              type="button"
              className="icon-button"
              onClick={() => setHistoryOpen((open) => !open)}
              aria-label="Журнал"
              aria-expanded={historyOpen}
              title="Журнал"
              data-testid="btn-history"
            >
              <HistoryIcon />
            </button>
          )}
        </header>

        <Display
          expression={state.expression}
          value={displayValue(state)}
          error={hasError}
          memory={state.memory}
        />
        <MemoryBar
          memory={state.memory}
          disabled={hasError}
          onMemory={(op) => dispatch({ type: 'memory', op })}
        />
        <Keypad pressed={pressed} error={hasError} onPress={(key) => dispatch(key.action)} />

        {showOverlay && (
          <>
            <div className="history-backdrop" onClick={() => setHistoryOpen(false)} />
            <HistoryPanel
              overlay
              history={state.history}
              onSelect={selectHistory}
              onClear={() => dispatch({ type: 'historyClear' })}
              onClose={() => setHistoryOpen(false)}
            />
          </>
        )}
      </section>

      {wide && (
        <HistoryPanel
          history={state.history}
          onSelect={selectHistory}
          onClear={() => dispatch({ type: 'historyClear' })}
        />
      )}
    </div>
  );
}
