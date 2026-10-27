"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "./types";
import { api } from "./api";
import { getSocket, disconnectSocket } from "./socket";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, avatarUrl?: string) => Promise<void>;
  loginWithGoogle: (payload: { idToken?: string; code?: string; redirectUri?: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("chatly_token");
    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    setToken(savedToken);
    api.getMe()
      .then((res) => {
        setUser(res.user);
        getSocket(savedToken);
      })
      .catch(() => {
        localStorage.removeItem("chatly_token");
        setToken(null);
        setUser(null);
        disconnectSocket();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem("chatly_token", res.token);
    setToken(res.token);
    setUser(res.user);
    getSocket(res.token);
  };

  const register = async (name: string, email: string, password: string, avatarUrl?: string) => {
    const res = await api.register({ name, email, password, avatarUrl });
    localStorage.setItem("chatly_token", res.token);
    setToken(res.token);
    setUser(res.user);
    getSocket(res.token);
  };

  const loginWithGoogle = async (payload: { idToken?: string; code?: string; redirectUri?: string }) => {
    const res = await api.googleAuth(payload);
    localStorage.setItem("chatly_token", res.token);
    setToken(res.token);
    setUser(res.user);
    getSocket(res.token);
  };

  const logout = () => {
    localStorage.removeItem("chatly_token");
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch {
      // Ignored
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
