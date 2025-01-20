
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from './components/Landing';
import { Room } from './components/Room';
import { ToastProvider } from "react-toast-notifications";

function App() {

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
