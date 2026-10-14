import { BackspaceIcon } from './icons.jsx';
import { KEYS } from './keys.js';

export default function Keypad({ pressed, error, onPress }) {
  return (
    <div className="keypad">
      {KEYS.map((key) => (
        <button
          key={key.id}
          type="button"
          className={`key key--${key.variant}${pressed === key.id ? ' key--pressed' : ''}`}
          data-testid={`btn-${key.id}`}
          aria-label={key.name}
          title={key.name !== key.label ? key.name : undefined}
          disabled={error && key.blockedOnError}
          onClick={() => onPress(key)}
        >
          {key.id === 'backspace' ? <BackspaceIcon /> : key.label}
        </button>
      ))}
    </div>
  );
}
