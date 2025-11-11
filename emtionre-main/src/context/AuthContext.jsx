import { createContext, useState, useContext } from "react";
import { users } from "../data/users.js";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);

  const login = (id, password) => {
    const foundUser = users.find((u) => u.id === id && u.password === password);
    if (foundUser) {
      setCurrentUser(foundUser);
      return true;
    }
    return false;
  };

  const logout = () => setCurrentUser(null);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
