import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "~/lib/supabaseClient";

interface AuthContextValue {
  user: any | null;
  isLoading: boolean;
  login: (opts: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACCESS_TOKEN_KEY = "supabase.access_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.access_token) {
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
          }
        } catch {
        }
      }
      setIsLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      try {
        if (typeof window !== "undefined") {
          if (session?.access_token) {
            window.localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
          } else {
            window.localStorage.removeItem(ACCESS_TOKEN_KEY);
          }
        }
      } catch {
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login: AuthContextValue["login"] = async ({ email, password }) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw error;
    }
    const session = data.session;
    if (session?.access_token) {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
        }
      } catch {
      }
    }
  };

  const logout: AuthContextValue["logout"] = async () => {
    await supabase.auth.signOut();
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      }
    } catch {
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
