import { RouterProvider } from 'react-router';
import router from './routes';
import { useSseConnection } from './services/useSseConnection';

function App() {
    // Open the server-sent events stream as soon as the user is authenticated.
    // It feeds RTK Query tag invalidations, so cached views (bookings, tickets,
    // events) refresh in real time without polling.
    useSseConnection();

    return <RouterProvider router={router} />;
}

export default App;
