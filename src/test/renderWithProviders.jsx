import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, useLocation } from 'react-router';
import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '@/services/baseApi';
import authReducer from '@/features/auth/authSlice';

function makeStore() {
    return configureStore({
        reducer: {
            auth: authReducer,
            [baseApi.reducerPath]: baseApi.reducer,
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware().concat(baseApi.middleware),
    });
}

function LocationDisplay() {
    const location = useLocation();
    return <div data-testid="location">{location.pathname}</div>;
}

export function renderWithProviders(ui, { initialEntries = ['/'] } = {}) {
    const store = makeStore();
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={initialEntries}>
                {ui}
                <LocationDisplay />
            </MemoryRouter>
        </Provider>
    );
}
