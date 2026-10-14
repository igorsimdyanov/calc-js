import { useEffect, useRef } from 'react';
import { KEYBOARD_MAP } from '../components/keys.js';

/**
 * Подписывается на нажатия физической клавиатуры и вызывает onKey
 * с id соответствующей кнопки калькулятора.
 */
export function useKeyboard(onKey) {
  const handlerRef = useRef(onKey);

  useEffect(() => {
    handlerRef.current = onKey;
  });

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const id = KEYBOARD_MAP[event.key];
      if (!id) return;
      // Не даём Enter повторно «нажать» кнопку, на которой стоит фокус
      event.preventDefault();
      handlerRef.current(id);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
