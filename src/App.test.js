import React from 'react';
import { act } from 'react';
import ReactDOM from 'react-dom/client';

jest.mock('react-router-dom', () => {
  const ReactLib = require('react');
  const OutletContext = ReactLib.createContext(null);

  function Route() {
    return null;
  }

  function Routes({ children }) {
    const routeArray = ReactLib.Children.toArray(children);
    const layoutRoute = routeArray.find((child) => ReactLib.Children.count(child.props.children) > 0);

    if (!layoutRoute) {
      return null;
    }

    const nestedRoutes = ReactLib.Children.toArray(layoutRoute.props.children);
    const homeRoute = nestedRoutes.find((child) => child.props.path === '/');

    return (
      <OutletContext.Provider value={homeRoute?.props.element ?? null}>
        {layoutRoute.props.element}
      </OutletContext.Provider>
    );
  }

  function Outlet() {
    return ReactLib.useContext(OutletContext);
  }

  return {
    __esModule: true,
    HashRouter: ({ children }) => <>{children}</>,
    Navigate: () => null,
    Outlet,
    Route,
    Routes,
    useLocation: () => ({ pathname: '/' }),
    useNavigate: () => jest.fn(),
    NavLink: ({ children, className, onClick, to }) => {
      const resolvedClassName = typeof className === 'function'
        ? className({ isActive: to === '/' })
        : className;

      return (
        <a className={resolvedClassName} href={to} onClick={onClick}>
          {children}
        </a>
      );
    },
    Link: ({ children, className, to }) => (
      <a className={className} href={to}>
        {children}
      </a>
    ),
  };
}, { virtual: true });

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
