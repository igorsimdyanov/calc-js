import Calculator from './components/Calculator.jsx';

export default function App() {
  return (
    <main className="app">
      <Calculator />
      <footer className="app__footer" data-testid="app-version">
        Учебный проект · версия {__APP_VERSION__}
      </footer>
    </main>
  );
}
