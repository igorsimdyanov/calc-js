import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';

// Примеры компонентных тестов. Дополните их своими сценариями.

const display = () => screen.getByTestId('display');
const expression = () => screen.getByTestId('expression');

async function press(user, ...ids) {
  for (const id of ids) {
    await user.click(screen.getByTestId(`btn-${id}`));
  }
}

describe('Калькулятор', () => {
  it('при запуске показывает 0', () => {
    render(<App />);
    expect(display()).toHaveTextContent(/^0$/);
    expect(expression()).toBeEmptyDOMElement();
  });

  it('вычисляет 12 + 30 = 42', async () => {
    const user = userEvent.setup();
    render(<App />);

    await press(user, 'digit-1', 'digit-2', 'add', 'digit-3', 'digit-0', 'equals');

    expect(display()).toHaveTextContent(/^42$/);
    expect(expression()).toHaveTextContent('12 + 30 =');
  });

  it('принимает ввод с клавиатуры', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.keyboard('6*7{Enter}');

    expect(display()).toHaveTextContent(/^42$/);
  });
});
