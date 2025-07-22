// frontend/src/pages/Login.tsx

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
// Import your configured API client instance
import api from "@/lib/api"; 

// Import UI components (these paths look correct based on your structure)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Import icons (these paths look correct based on your structure)
import { Eye, EyeOff, Camera } from "lucide-react"; 

// Import toast hook (this path looks correct)
import { toast, useToast } from "@/hooks/use-toast";
import { error } from "console";

// Remove this interface as setIsAuthenticated prop is removed from ProtectedRoute and Login
// interface LoginProps {
//   setIsAuthenticated: (value: boolean) => void;
// }

// Login component - it no longer receives setIsAuthenticated prop
const Login = () => { // Removed { setIsAuthenticated } from props
 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast(); // Destructure toast from the hook
  const [apiError, setApiError] = useState <string | null>(null); // Add state for API errors if needed

  (""); // Add state for API errors if needed
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setApiError(null); // Add state for API errors if needed, or just use toast for errors

    try {
      // *** REPLACE SIMULATED API CALL WITH REAL ONE ***
      // Call your backend's login endpoint provided by djoser-simplejwt
      const response = await api.post("/auth/jwt/create/", {
        email: email, // Your backend expects 'username', even if the field is 'email' in the UI
        password: password,
      });

      // *** Handle Successful Login ***
      // Save the tokens received from the backend response to local storage
      localStorage.setItem("access_token", response.data.access);
      localStorage.setItem("refresh_token", response.data.refresh);

      // Use the toast notification for success
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
        duration: 3000, // Show toast for 3 seconds
      });

      // Navigate the user to the protected dashboard route
      navigate("/dashboard");

    } catch (error) {
      // *** Handle Login Errors ***
      console.error("Login failed:", error.response.data || error);
      
      const errorData = error.response?.data;
      let errorMessage = "Login failed. Invalid credentials or server error.";

      if (errorData){
        if (typeof errorData === 'object') {
          errorMessage = errorData.detail 
                      || Object.entries(errorData)
              .map(([field,messages]) => {
                   const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ');
                   return `${fieldName}: ${Array.isArray(messages) ? messages.join(', ') : messages}`;
              })
              .join(' ');
        } else {
          errorMessage = JSON.stringify(errorData);
        }
      }
      setApiError(errorMessage);

      toast({
        title: "Login failed",
        description: error.response?.data?.detail || "Invalid credentials or server error.", // Use backend error or a default
        variant: "destructive", // Use a destructive toast style for errors
        duration: 5000,
      });

    } finally {
      // Ensure loading state is reset after API call finishes (success or failure)
      setIsLoading(false);
    }
  };

  return (
    // Keep your existing Tailwind layout and Card structure
    <div className="min-h-screen bg-gradient-to-br from-forest-900 via-forest-800 to-earth-900 flex items-center justify-center p-4 nature-pattern">
      <div className="absolute inset-0 bg-black/20"></div>

      <Card className="w-full max-w-md glass-card animate-fade-in-up relative z-10">
        <CardHeader className="space-y-6 text-center">
          {/* ... (keep CardHeader content - icon, titles) ... */}
            <div className="mx-auto w-16 h-16 bg-forest-gradient rounded-2xl flex items-center justify-center animate-float">
                <Camera className="w-8 h-8 text-white" />
            </div>
            <div>
                <CardTitle className="text-2xl font-bold text-primary">Welcome Back</CardTitle>
                <CardDescription className="text-forest-600">
                Sign in to continue to SmartAttend
                </CardDescription>
            </div> 
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Link your form to the handleSubmit function */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-forest-500">Email</Label>
              <Input
                id="email"
                type="email" // Changed type to email if you want email input keyboard on mobile
                placeholder="teacher@website.com "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-dark/20 text-dark placeholder:text-forest-300"
                required
              />
            </div>

            {/* Password field with toggle */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-forest-500">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/10 border-dark/20 text-dark placeholder:text-forest-300 pr-12"
                  required
                />
                 {/* Toggle button for password visibility */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-300 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {apiError &&(
              <div className="text-sm text-red-500 text-center">{apiError}</div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full btn-primary" // Ensure 'btn-primary' is a defined Tailwind class or utility
              disabled={isLoading} // Disable button while loading
            >
              {isLoading ? "Signing in..." : "Sign In"} {/* Show loading text */}
            </Button>
          </form>

          {/* Links for forgot password and sign up */}
          <div className="text-center space-y-4">
            <Link
              to="/forgot-password" // Ensure this route exists in App.js
              className="text-sm text-forest-300 hover:text-blue transition-colors"
            >
              Forgot your password?
            </Link>

            <div className="text-sm text-forest-300">
              Don't have an account?{" "}
              <strong>
              <Link
                to="/register" // Ensure this route exists in App.js
                className="text-forest-800 hover:text-forest-200 font-medium transition-colors"
              >
                Sign up
              </Link>
              </strong>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;