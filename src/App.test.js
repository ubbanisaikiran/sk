import React from 'react';
import { act } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('renders the launch prompt', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    act(() => {
      root.render(<App />);
    });

    act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(container.textContent).toContain('Open to opportunities');
    expect(container.textContent).toContain('What brings you here today?');

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
