import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Room from './pages/Room'
import AuthCallback from './pages/AuthCallback'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:id" element={<Room />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
