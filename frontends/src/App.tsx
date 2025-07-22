
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Students from "./pages/Students";
import TakeAttendance from "./pages/TakeAttendance";
import Settings from "./pages/Settings";
import ProtectedRoute from "./components/ProtectedRoute";
import ResetPasswordConfirmPage from "./pages/ResetPasswordConfirmPage";



console.log("QueryClient instance created at:", new Date().toLocaleTimeString());

const queryClient = new QueryClient();

const App = () => {
  
  return (
    <QueryClientProvider client={queryClient}>
      {/* ... (Toaster, Sonner, TooltipProvider) ... */}
      <Toaster />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            {/* REMOVE setIsAuthenticated prop */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/password/reset/confirm/:uid/:token" element={<ResetPasswordConfirmPage/>}/>

            {/* Protected routes - REMOVE isAuthenticated prop from ProtectedRoute */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
            <Route path="/courses/:courseId" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
            <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
            <Route path="/take-attendance" element={<ProtectedRoute><TakeAttendance /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      {/* ... */}
    </QueryClientProvider>
  );
};

export default App;
