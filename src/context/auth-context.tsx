"use client";

import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { auth, db, firebaseReady } from "@/lib/firebase/client";
import { friendlyAuthError } from "@/lib/firebase/errors";
import type { AppUser } from "@/types/domain";

type AuthContextValue = {
  user: User | null;
  profile: AppUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false);
      setError("Brakuje konfiguracji Firebase. Uzupełnij plik .env.local.");
      return;
    }

    void setPersistence(auth, browserLocalPersistence);
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setError(null);

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const profileRef = doc(db, "users", nextUser.uid);
        const profileSnapshot = await getDoc(profileRef);
        if (profileSnapshot.exists()) {
          setProfile({ id: profileSnapshot.id, ...profileSnapshot.data() } as AppUser);
        } else {
          const fallbackProfile = {
            name: nextUser.displayName || nextUser.email?.split("@")[0] || "Użytkownik",
            email: nextUser.email || "",
            role: "worker",
            createdAt: serverTimestamp(),
          };
          await setDoc(profileRef, fallbackProfile, { merge: true });
          setProfile({ id: nextUser.uid, ...fallbackProfile } as AppUser);
        }
      } catch {
        setError("Sesja jest aktywna, ale nie udało się pobrać profilu użytkownika.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (loginError) {
      const message = friendlyAuthError(loginError);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const changePassword = useCallback(
    async (password: string) => {
      if (!user) throw new Error("Zaloguj się ponownie, aby zmienić hasło.");
      try {
        await updatePassword(user, password);
      } catch (passwordError) {
        throw new Error(friendlyAuthError(passwordError));
      }
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, profile, loading, error, login, logout, changePassword }),
    [changePassword, error, loading, login, logout, profile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
