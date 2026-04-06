"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { User } from "@supabase/supabase-js";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useInitialization } from "./InitializationProvider";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { registerTask, markTaskComplete } = useInitialization();
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const checkUser = async () => {
    registerTask("auth:init");
    try {
      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser();
      setUser(sessionUser);
      if (sessionUser) {
        (window as any).electron?.notifyAuthSignin?.();
      } else {
        (window as any).electron?.notifyAuthSignout?.();
      }
    } catch (error) {
      setUser(null);
      (window as any).electron?.notifyAuthSignout?.();
    } finally {
      setLoading(false);
      markTaskComplete("auth:init");
    }
  };

  const processAuthUrl = async (url: string) => {
    console.log("[Auth] Processing deep link:", url);
    try {
      setLoading(true);
      const parsedUrl = new URL(url.replace("#", "?"));

      const errorMsg =
        parsedUrl.searchParams.get("error_description") ||
        parsedUrl.searchParams.get("error");
      if (errorMsg) {
        notifications.show({
          title: "Authentication Error",
          message: errorMsg.replace(/\+/g, " "),
          color: "red",
          icon: <IconX size={18} />,
          autoClose: 10000,
        });
        return;
      }

      const accessToken = parsedUrl.searchParams.get("access_token");
      const refreshToken = parsedUrl.searchParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;

        notifications.show({
          title: "Welcome Back!",
          message: "Your email has been verified successfully.",
          color: "teal",
          icon: <IconCheck size={18} />,
        });
      } else {
        const code = parsedUrl.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          notifications.show({
            title: "Email Verified",
            message: "You are now logged in.",
            color: "teal",
            icon: <IconCheck size={18} />,
          });
        }
      }
      await checkUser();
    } catch (err: any) {
      console.error("[Auth] Deep link processing failed:", err);
      notifications.show({
        title: "Link Processing Failed",
        message:
          err.message ||
          "An unexpected error occurred while verifying the link.",
        color: "red",
        icon: <IconX size={18} />,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      await checkUser();

      const bufferedUrl = await (window as any).electron.getAuthCallback();
      if (bufferedUrl) {
        processAuthUrl(bufferedUrl);
      }
    };

    initAuth();

    const cleanupProtocol = (window as any).electron.onAuthCallback(
      async (url: string) => {
        processAuthUrl(url);
      },
    );
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser();
      await checkUser();
      (window as any).electron?.notifyAuthSignin?.();
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: "fitgirl-repacks://auth-callback",
          data: {
            full_name: name,
          },
        },
      });
      if (error) throw error;
      await checkUser();
      return data;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      (window as any).electron?.notifyAuthSignout?.();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "fitgirl-repacks://auth-callback",
      });
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setIsPasswordRecovery(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        refresh: checkUser,
        resetPassword,
        updatePassword,
        isPasswordRecovery,
        setIsPasswordRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
