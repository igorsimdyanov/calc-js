import { formatDisplay } from '../logic/format.js';

function sizeFor(value) {
  if (value.length > 18) return 'xs';
  if (value.length > 14) return 'sm';
  if (value.length > 10) return 'md';
  return 'lg';
}

export default function Display({ expression, value, error, memory }) {
  const size = error ? 'sm' : sizeFor(value);

  return (
    <div className="display">
      <div className="display__top">
        {memory !== null && (
          <span
            className="display__memory"
            title={`В памяти: ${formatDisplay(memory)}`}
            data-testid="memory-indicator"
          >
            M
          </span>
        )}
        <div className="display__expression">
          <span data-testid="expression">{expression}</span>
        </div>
      </div>
      <output
        className={`display__value display__value--${size}${error ? ' display__value--error' : ''}`}
        data-testid="display"
        aria-live="polite"
      >
        {value}
      </output>
    </div>
  );
}
