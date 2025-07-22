
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";


const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "", // Using camelCase for frontend state
    lastName: "",  // Using camelCase for frontend state
    email: "",
    password: "",
    re_password: "",
    faculty: "",   // Using camelCase for frontend state
    department: "",
  });
  const [apiError, setApiError] = useState <string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
};

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("handledSubmit Triggered");
    e.preventDefault();
    
    if (formData.password !== formData.re_password) {
      console.log("Passwords do not match. Showing error toast.")
      setApiError("Passwords do not match.");
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    setIsLoading(true);
    setApiError(null);


    try {
      // *** CONNECT TO BACKEND REGISTRATION ENDPOINT ***
      console.log("Attempting API call to /auth/users/");
      // Call your backend's user creation endpoint (Djoser default: /auth/users/)
      // Make sure the payload keys match your backend serializer
      const payload = {
        email: formData.email,
        password: formData.password,
        username: formData.email,
        re_password: formData.re_password,
        first_name: formData.firstName, // Use backend field names (snake_case)
        last_name: formData.lastName,   // Use backend field names (snake_case)
        faculty: formData.faculty,     // Use backend field names (snake_case)
        department: formData.department,
      };

     const response = await api.post("/auth/users/", payload);
    
     console.log("Registration successful!", response.data)

      // *** Handle Successful Registration ***
      toast({
        title: "Account created!",
        description: "Registration successful. You can now sign in.", // Adjusted message
        duration: 5000,
      });

      // Navigate to the login page after successful registration
      navigate("/login");

    } catch (error) {
      // *** Handle Registration Errors ***
      console.error("Registration failed:", error.response?.data || error);

      // Extract and format error message(s) from backend response
      const errorData = error.response?.data;
      let errorMessage = "Registration failed. Please try again.";

      if (errorData) {
          if (typeof errorData === 'object') {
              // Djoser often returns errors in an object { field: ["error message"], ... }
              // Try to format these into a readable string
              errorMessage = Object.entries(errorData)
                  .map(([field, messages]) => {
                      // Make field names readable (e.g., re_password -> Re password)
                      const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
                      return `${fieldName}: ${Array.isArray(messages) ? messages.join(', ') : messages}`;
                  })
                  .join('; '); // Join multiple field errors with a space
          } else {
               // Fallback if errorData is not an object (e.g., simple string error)
              errorMessage = errorData.detail || JSON.stringify(errorData);
          }
      }
      setApiError(errorMessage); // Set error state to display below form

      toast({
        title: "Registration failed",
        description: errorMessage, // Also show in toast
        variant: "destructive",
        duration: 7000,
      });

    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  const facultyOptions = [
    { value: 'School of Engineering', label: 'School of Engineering' },
    { value: 'School ofScience', label: 'School ofScience' },
    { value: 'arts', label: 'Arts' },
    { value: 'medicine', label: 'Medicine' },
    // Add more faculties here
];

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-900 via-forest-800 to-earth-900 flex items-center justify-center p-4 nature-pattern">
      <div className="absolute inset-0 bg-black/20"></div>
      
      <Card className="w-full max-w-md glass-card animate-fade-in-up relative z-10">
        <CardHeader className="space-y-6 text-center">
          <div className="mx-auto w-16 h-16 bg-earth-gradient rounded-2xl flex items-center justify-center animate-float">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-earth-600">Create Account</CardTitle>
            <CardDescription className="text-forest-600">
              Join SmartAttend to start smart attendance tracking
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-forest-100">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="bg-white/10 border-white/20 text-white placeholder:text-forest-300"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-forest-100">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="bg-white/10 border-white/20 text-white placeholder:text-forest-300"
                  required
                />
              </div>
            </div> */}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-forest-600">First Name *</Label> {/* Mark required if needed */}
                <Input
                  id="firstName"
                  name="firstName" // Name attribute matches state key
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="bg-white/10 border-dark/20 text-dark placeholder:text-forest-300"
                  required // Mark required if backend requires it
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-forest-600">Last Name *</Label> {/* Mark required if needed */}
                <Input
                  id="lastName"
                  name="lastName" // Name attribute matches state key
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="bg-white/10 border-dark/20 text-dark placeholder:text-forest-300"
                  required // Mark required if backend requires it
                />
              </div>
            </div>

             {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-forest-600">Email *</Label> {/* Mark required */}
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="teacher@school.edu"
                value={formData.email}
                onChange={handleChange}
                className="bg-white/10 border-dark/20 text-dark placeholder:text-forest-300"
                required
              />
            </div>

             {/* Faculty and Department in a grid */}
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="faculty" className="text-forest-600">Faculty</Label>
                    <Select
                       name="faculty" // Name attribute matches state key
                       value={formData.faculty}
                       onValueChange={(value) => handleSelectChange('faculty', value)} // Use handleSelectChange
                    >
                      <SelectTrigger className="bg-white/10 border-dark/20 text-dark placeholder:text-forest-300">
                        <SelectValue placeholder="Select Faculty" />
                      </SelectTrigger>
                      <SelectContent>
                        {facultyOptions.map(option => (
                           <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="department" className="text-forest-600">Department</Label>
                    <Input
                      id="department"
                      name="department" // Name attribute matches state key
                      placeholder="Computer Science"
                      value={formData.department}
                      onChange={handleChange}
                      className="bg-white/10 border-dark/20 text-dark placeholder:text-forest-300"
                    />
                </div>
             </div>

            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-forest-600">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
                  className="bg-white/10 border-dark/20 text-dark placeholder:text-forest-300 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-600 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="re_password" className="text-forest-600">Confirm Password</Label>
              <Input
                id="re_password"
                name="re_password"
                type="password"
                placeholder="Confirm your password"
                value={formData.re_password}
                onChange={handleChange}
                className="bg-white/10 border-dark/20 text-dark placeholder:text-forest-300"
                required
              />
            </div>
            
            <Button
              type="submit"
              className="w-full btn-primary"
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
          
          <div className="text-center">
            <div className="text-sm text-forest-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-dark hover:text-forest-400 font-medium transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
