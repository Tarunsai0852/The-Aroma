import React, { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Import Pages
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Dashboard from "./pages/dashboard/Dashboard";
import RecipeBuilder from "./pages/recipe/Builder";
import SavedRecipes from "./pages/recipe/SavedRecipes";
import AIRecipes from "./pages/recipe/AIRecipes";
import RecipeDetail from "./pages/recipe/RecipeDetail";
import PlanMeals from "./pages/planner/PlanMeals";
import ContentStudio from "./pages/cms/ContentStudio";

// Modified Protected Route Component - Always allows access
const ProtectedRoute = ({ children }) => {
  return children;
};

// Modified Public Route - Always redirects to dashboard
const PublicRoute = ({ children }) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate("/dashboard");
  }, [navigate]);

  return null;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" />} />
      
      {/* Public Routes - will redirect to dashboard */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />

      {/* Protected Routes - now accessible without auth */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recipe-builder"
        element={
          <ProtectedRoute>
            <RecipeBuilder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saved-recipes"
        element={
          <ProtectedRoute>
            <SavedRecipes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-recipes"
        element={
          <ProtectedRoute>
            <AIRecipes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/plan-meals"
        element={
          <ProtectedRoute>
            <PlanMeals />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cms"
        element={
          <ProtectedRoute>
            <ContentStudio />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recipe/:recipeId"
        element={
          <ProtectedRoute>
            <RecipeDetail />
          </ProtectedRoute>
        }
      />

      {/* Fallback Route */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
