import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Room from './pages/Room';

const App = () => {

  const router = createBrowserRouter([
    {
      path: "/",
      element: <Room />,
      errorElement: <></>,
      children:[

      ]
    },
  ]);

  return (
      <RouterProvider router={router} />
  )
}

export default App