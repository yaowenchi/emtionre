import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SatisfactionChart from "./pages/SatisfactionChart";
import ChangePassword from "./pages/ChangePassword";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chart" element={<SatisfactionChart />} />
          <Route path="/change-password" element={<ChangePassword />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
