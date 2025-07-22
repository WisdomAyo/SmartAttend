
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const { mutate: sendResetLink, isPending } = useMutation({
    mutationFn: (userEmail: string) => {
      const response = api.post("/auth/users/reset_password/", { email:userEmail });
      return response;
    },

    onSuccess: () => {
      setIsSubmitted(true);
      toast({
         title: "Request Received",
         description: "if an account with that email exist, a reset link has been sent"
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.detail || "An error occured. Please try again later.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!email){
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    sendResetLink(email);

    // setIsLoading(true);

    // // Simulate API call
    // setTimeout(() => {
    //   setIsSubmitted(true);
    //   toast({
    //     title: "Reset link sent!",
    //     description: "Check your email for password reset instructions.",
    //   });
    //   setIsLoading(false);
    // }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-900 via-forest-800 to-earth-900 flex items-center justify-center p-4 nature-pattern">
      <div className="absolute inset-0 bg-black/20"></div>
      
      <Card className="w-full max-w-md glass-card animate-fade-in-up relative z-10">
        <CardHeader className="space-y-6 text-center">
          <div className="mx-auto w-16 h-16 bg-amber-gradient rounded-2xl flex items-center justify-center animate-float">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-600">Reset Password</CardTitle>
            <CardDescription className="text-forest-700">
              {isSubmitted 
                ? "Check your email for reset instructions"
                : "Enter your email to receive reset instructions"
              }
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-forest-100">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/10 border-white/10 text-white placeholder:text-forest-700"
                  required
                />
              </div>
              
              <Button
                type="submit"
                className="w-full btn-primary"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <div className="w-8 h-8 bg-green-800 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
              </div>
              <p className="text-forest-600">
                We've sent password reset instructions to <strong className="text-forest">{email}</strong>
                you will receive an email shortly.
              </p>
            </div>
          )}
          
          <div className="text-center">
            <Link
              to="/login"
              className="text-sm text-forest-700 hover:text-white transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
