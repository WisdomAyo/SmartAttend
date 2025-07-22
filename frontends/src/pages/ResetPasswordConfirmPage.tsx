import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {useMutation} from "@tanstack/react-query";
import api from "@/lib/api";

const ResetPasswordConfirmPage = () => {
  const { uid, token } = useParams<{uid: string; token: string}>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
 

  // Password validation rules
  const validations = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isPasswordValid = Object.values(validations).every(Boolean);
  const doPasswordsMatch = password === confirmPassword && password.length > 0;


  const { mutate: resetPassword, isPending } = useMutation({
    mutationFn: () => {
      // Djoser's endpoint for confirming the password reset.
      // It expects uid, token, new_password, and re_new_password.
      return api.post("/auth/users/reset_password_confirm/", {
        uid: uid,
        token: token,
        new_password: password,
        re_new_password: confirmPassword,
      });
    },
    onSuccess: () => {
      setIsSuccess(true);
      toast({
        title: "Password Updated!",
        description: "Your password has been successfully changed.",
      });
      // Redirect to the login page after a delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    },
    onError: (error: any) => {
      // Handle errors from the backend (e.g., invalid token, password too common)
      const errorData = error.response?.data || {};
      const errorMessage = Object.values(errorData).flat().join(' ') || "An error occurred. The link might be expired.";
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid || !doPasswordsMatch) {
      toast({
        title: "inalid Password",
        description: "Please ensure your password meat all the requirement.",
        variant: "destructive"
      });

      return;
    }
      
      resetPassword();
  };
    
  //   setIsLoading(true);

  //   // Simulate API call
  //   setTimeout(() => {
  //     setIsSuccess(true);
  //     toast({
  //       title: "Password updated!",
  //       description: "Your password has been successfully changed.",
  //     });
  //     setTimeout(() => {
  //       navigate('/login');
  //     }, 2000);
  //     setIsLoading(false);
  //   }, 1000);
  // };

  const ValidationItem = ({ isValid, text }: { isValid: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-sm transition-colors ${isValid ? 'text-green-400' : 'text-forest-300'}`}>
      {isValid ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <X className="w-4 h-4 text-forest-400" />
      )}
      <span>{text}</span>
    </div>
  );


  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-900 via-forest-800 to-earth-900 flex items-center justify-center p-4 nature-pattern">
      <div className="absolute inset-0 bg-black/20"></div>
      
      <Card className="w-full max-w-md glass-card animate-fade-in-up relative z-10">
        <CardHeader className="space-y-6 text-center">
          <div className="mx-auto w-16 h-16 bg-amber-gradient rounded-2xl flex items-center justify-center animate-float">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-white">Create New Password</CardTitle>
            <CardDescription className="text-forest-200">
              {isSuccess 
                ? "Password updated successfully!"
                : "Create a secure password"
              }
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-forest-100">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-forest-300 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-300 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {password && (
                <div className="space-y-2">
                  <Label className="text-forest-100 text-sm">Password Requirements</Label>
                  <div className="space-y-1 p-3 bg-white/5 rounded-lg border border-white/10">
                    <ValidationItem isValid={validations.length} text="At least 8 characters" />
                    <ValidationItem isValid={validations.uppercase} text="One uppercase letter" />
                    <ValidationItem isValid={validations.lowercase} text="One lowercase letter" />
                    <ValidationItem isValid={validations.number} text="One number" />
                    <ValidationItem isValid={validations.special} text="One special character" />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-forest-100">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-forest-300 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-300 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && !doPasswordsMatch && (
                  <p className="text-red-400 text-sm flex items-center gap-1">
                    <X className="w-4 h-4" />
                    Passwords don't match
                  </p>
                )}
                {confirmPassword && doPasswordsMatch && (
                  <p className="text-green-400 text-sm flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Passwords match
                  </p>
                )}
              </div>
              
              <Button
                type="submit"
                className="w-full btn-primary"
                disabled={isPending || !isPasswordValid || !doPasswordsMatch}
              >
                {isPending ? "Updating Password..." : "Update Password"}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
              </div>
              <p className="text-forest-200">
                Your password has been successfully updated! You can now sign in with your new password.
              </p>
              <p className="text-forest-300 text-sm">Redirecting to login...</p>
            </div>
          )}
          
          <div className="text-center">
            <Link
              to="/login"
              className="text-sm text-forest-300 hover:text-white transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordConfirmPage;