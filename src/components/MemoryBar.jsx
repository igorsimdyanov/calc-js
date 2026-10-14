import { MEMORY_KEYS } from './keys.js';

export default function MemoryBar({ memory, disabled, onMemory }) {
  return (
    <div className="memory-bar" role="group" aria-label="Память">
      {MEMORY_KEYS.map((key) => (
        <button
          key={key.id}
          type="button"
          className="memory-bar__button"
          data-testid={`btn-${key.id}`}
          aria-label={key.name}
          title={key.name}
          disabled={disabled || (key.needsMemory && memory === null)}
          onClick={() => onMemory(key.op)}
        >
          {key.label}
        </button>
      ))}
    </div>
  );
}
