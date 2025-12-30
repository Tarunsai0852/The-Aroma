import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // Set a default user
  const [user] = useState({
    id: "default-user",
    email: "demo@example.com",
    user_metadata: {
      full_name: "Demo User"
    }
  });
  const [loading] = useState(false);
  const [isNewRegistration] = useState(false);

  return (
    <AuthContext.Provider value={{ user, loading, isNewRegistration }}>
      {children}
    </AuthContext.Provider>
  );
};
