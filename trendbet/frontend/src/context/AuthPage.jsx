// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();
// ❌ Remove this line: const auth = getAuth(app);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          // ✅ Save/update user info in RTDB
          await update(ref(db, `users/${currentUser.uid}`), {
            uid: currentUser.uid,
            email: currentUser.email || null,
            phoneNumber: currentUser.phoneNumber || null,
            displayName: currentUser.displayName || "Anonymous",
            photoURL: currentUser.photoURL || null,
            lastLogin: new Date().toISOString(),
          });

          // ✅ Check admin privileges
          const adminRef = child(ref(db), `admins/${currentUser.uid}`);
          const snapshot = await get(adminRef);
          setIsAdmin(snapshot.exists() && snapshot.val() === true);

          setUser(currentUser);
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Auth error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // ✅ Logout function
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, isAdmin, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
