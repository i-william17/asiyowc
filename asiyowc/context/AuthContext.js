import React, { createContext, useContext } from 'react';

const AuthContext = createContext(null);

/**
 * 🔒 AuthProvider (Redux is the source of truth)
 * This provider is intentionally passive.
 * DO NOT manage auth state here.
 */
export const AuthProvider = ({ children }) => {
  const authContext = {
    signIn: () => {
      console.warn(
        '[AuthContext] signIn called — auth is handled by Redux'
      );
    },
    signOut: () => {
      console.warn(
        '[AuthContext] signOut called — use redux logoutUser'
      );
    },
    signUp: () => {
      console.warn(
        '[AuthContext] signUp called — auth is handled by Redux'
      );
    },
    state: null,
  };

  return (
    <AuthContext.Provider value={authContext}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
