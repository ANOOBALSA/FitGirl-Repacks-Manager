"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { pb } from "../../lib/pocketbase";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useInitialization } from "./InitializationProvider";

interface AuthContextType {
  user: any | null;
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
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { registerTask, markTaskComplete } = useInitialization();
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const checkUser = async () => {
    registerTask("auth:init");
    try {
      if (pb.authStore.isValid && pb.authStore.model) {
        setUser(pb.authStore.model);
        (window as any).electron?.notifyAuthSignin?.();
      } else {
        setUser(null);
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

  useEffect(() => {
    const initAuth = async () => {
      await checkUser();

      // PocketBase handles OAuth redirect differently, but for now we follow the same pattern
      const bufferedUrl = await (window as any).electron.getAuthCallback();
      if (bufferedUrl) {
        // processAuthUrl(bufferedUrl); // TODO: Implement if OAuth is needed
      }
    };

    initAuth();

    // Listen for auth store changes
    pb.authStore.onChange((token, model) => {
      setUser(model);
      if (model) {
        (window as any).electron?.notifyAuthSignin?.();
      } else {
        (window as any).electron?.notifyAuthSignout?.();
      }
    }, true);
  }, []);

  // Heartbeat to keep "Online" status active in admin panel
  useEffect(() => {
    if (!user) return;

    // Send initial heartbeat
    const sendHeartbeat = async () => {
      try {
        await pb.collection("users").update(user.id, {});
      } catch (error) {
        // Silently fail, might be network issue or logged out
      }
    };

    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [user?.id]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await pb.collection("users").authWithPassword(email, password);
      await checkUser();
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const data = await pb.collection("users").create({
        email,
        password,
        passwordConfirm: password,
        name,
        emailVisibility: true,
      });

      // Auto login after signup in PocketBase if no verification is forced
      // Or just return data and let them verify
      return data;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      pb.authStore.clear();
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
      await pb.collection("users").requestPasswordReset(email);
      notifications.show({
        title: "Reset Link Sent",
        message: "Check your email for password reset instructions.",
        color: "teal",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (password: string) => {
    setLoading(true);
    try {
      if (!pb.authStore.model) throw new Error("Not logged in");
      await pb.collection("users").update(pb.authStore.model.id, {
        password,
        passwordConfirm: password,
      });
      setIsPasswordRecovery(false);
      notifications.show({
        title: "Password Updated",
        message: "Your password has been changed successfully.",
        color: "teal",
      });
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
