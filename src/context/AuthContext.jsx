import { createContext, useContext, useState, useEffect } from 'react';
import {
  getCurrentUser,
  setCurrentUser,
  getUsers,
  saveUsers,
  hashPassword,
} from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getCurrentUser);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  async function login(email, password) {
    const users = getUsers();
    const found = users.find((u) => u.email === email);
    if (!found) return { success: false, message: 'Invalid email or password.' };

    const hash = await hashPassword(password);
    if (found.passwordHash !== hash) {
      return { success: false, message: 'Invalid email or password.' };
    }

    setUser(found);
    return { success: true, user: found };
  }

  async function register(name, email, password) {
    const users = getUsers();
    if (users.find((u) => u.email === email)) {
      return { success: false, message: 'Email is already registered.' };
    }
    const passwordHash = await hashPassword(password);
    const newUser = {
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash,
      role: 'student',
      createdAt: new Date().toISOString(),
    };
    saveUsers([...users, newUser]);
    // Do not auto-login; redirect the user to the login page instead
    return { success: true, user: newUser };
  }

  function logout() {
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
