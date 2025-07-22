
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Users, Clock, TrendingUp, BookOpen, Camera, CheckCircle2, BarChart3, ArrowRight, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Camera,
      title: "Face Recognition",
      description: "Advanced AI-powered facial recognition for accurate attendance tracking"
    },
    {
      icon: Clock,
      title: "Real-time Tracking",
      description: "Instant attendance recording with live status updates"
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      description: "Comprehensive attendance analytics and automated Excel reports"
    },
    {
      icon: Users,
      title: "Student Management",
      description: "Complete student database with photo recognition profiles"
    }
  ];

  const stats = [
    { value: "99.8%", label: "Accuracy Rate", icon: CheckCircle2 },
    { value: "50%", label: "Time Saved", icon: Clock },
    { value: "500+", label: "Schools Using", icon: BookOpen },
    { value: "95%", label: "Teacher Satisfaction", icon: TrendingUp }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-50 to-earth-50 nature-pattern">
      {/* Navigation Header */}
      <header className="relative z-50 p-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-forest-gradient rounded-xl flex items-center justify-center animate-pulse-glow">
              <Camera className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-forest-900">SmartAttend</h1>
              <p className="text-forest-600 text-sm">Smart Attendance Revolution</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/login')}
              className="text-forest-700 hover:text-forest-900"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => navigate('/register')}
              className="btn-primary"
            >
              Get Started
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-forest-900 via-forest-800 to-earth-800 text-white">
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full bg-repeat" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='7' cy='7' r='3'/%3E%3Ccircle cx='53' cy='7' r='3'/%3E%3Ccircle cx='7' cy='53' r='3'/%3E%3Ccircle cx='53' cy='53' r='3'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            animation: "pulse 2s infinite"
          }} />
        </div>
        
        <div className="relative p-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
            <div className="space-y-8 animate-fade-in-up">
              <div className="flex items-center space-x-2 text-amber-400">
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <span className="text-forest-200 ml-2">Trusted by 500+ Schools</span>
              </div>
              
              <h2 className="text-6xl font-bold leading-tight">
                Transform Your
                <span className="bg-gradient-to-r from-amber-400 to-forest-300 bg-clip-text text-transparent"> Attendance </span>
                System
              </h2>
              
              <p className="text-xl text-forest-200 leading-relaxed">
                Experience the future of attendance tracking with AI-powered facial recognition. 
                Streamline your classroom management and boost efficiency by 50%.
              </p>
              
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6">
                <Button 
                  onClick={() => navigate('/register')}
                  className="btn-primary text-lg px-8 py-4 animate-slide-in-right group"
                  size="lg"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  variant="outline" 
                  className="border-2 border-white text-white hover:bg-white hover:text-forest-900 text-lg px-8 py-4"
                  onClick={() => navigate('/login')}
                  size="lg"
                >
                  Watch Demo
                  <Play className="w-5 h-5 ml-2" />
                </Button>
              </div>
              
              <div className="text-forest-300 text-sm">
                ✓ No credit card required  ✓ Setup in 5 minutes  ✓ 14-day free trial
              </div>
            </div>

            {/* Video Section */}
            <div className="relative animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <div className="aspect-video bg-forest-950 rounded-2xl overflow-hidden shadow-2xl border border-forest-600">
                <div className="relative w-full h-full bg-gradient-to-br from-forest-800 to-forest-950 flex items-center justify-center">
                  <div className="absolute inset-4 bg-forest-900 rounded-xl flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 bg-forest-gradient rounded-full flex items-center justify-center mx-auto animate-pulse-glow">
                        <Play className="w-10 h-10 text-white ml-1" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white">See FaunaAttend in Action</h3>
                        <p className="text-forest-300">Watch how AI transforms attendance</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Floating elements */}
                  <div className="absolute top-6 left-6 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                  <div className="absolute bottom-8 right-8 w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                  <div className="absolute top-1/3 right-6 w-1 h-8 bg-forest-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="p-6 -mt-16 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {stats.map((stat, index) => (
            <Card key={stat.label} className="glass-card text-center animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
              <CardContent className="p-6">
                <stat.icon className="w-8 h-8 text-forest-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-forest-900">{stat.value}</div>
                <p className="text-sm text-forest-600">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="p-6 space-y-8 max-w-7xl mx-auto">
        <div className="text-center space-y-4 animate-fade-in-up">
          <h2 className="text-4xl font-bold text-forest-900">Why Choose FaunaAttend?</h2>
          <p className="text-xl text-forest-600 max-w-3xl mx-auto">
            Revolutionary features designed to make attendance tracking effortless and accurate
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={feature.title} className="glass-card hover:shadow-xl transition-all duration-300 animate-fade-in-up group" style={{ animationDelay: `${index * 150}ms` }}>
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-forest-gradient rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-forest-900">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-forest-600">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Enhanced CTA Section */}
      <div className="p-6 py-20">
        <Card className="bg-gradient-to-r from-forest-800 to-earth-800 border-none animate-fade-in-up max-w-5xl mx-auto">
          <CardContent className="p-16 text-center text-white">
            <div className="space-y-8">
              <div className="inline-flex items-center px-4 py-2 bg-amber-500/20 rounded-full text-amber-200 text-sm font-medium">
                🚀 Join 500+ Schools Already Using FaunaAttend
              </div>
              
              <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Attendance?</h2>
              <p className="text-xl text-forest-200 mb-8 max-w-2xl mx-auto">
                Start your free trial today and see why educators worldwide trust FaunaAttend 
                to streamline their attendance process.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                <Button 
                  onClick={() => navigate('/register')}
                  className="btn-primary text-lg px-10 py-4 group"
                  size="lg"
                >
                  Start Free Trial Now
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  variant="outline" 
                  className="border-2 border-white text-white hover:bg-white hover:text-forest-900 text-lg px-10 py-4"
                  onClick={() => navigate('/login')}
                  size="lg"
                >
                  Sign In to Dashboard
                </Button>
              </div>
              
              <div className="text-forest-300 text-sm mt-6">
                No setup fees • Cancel anytime • 24/7 support included
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-forest-900 text-forest-200 p-6 py-12">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-forest-gradient rounded-xl flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">FaunaAttend</h3>
              <p className="text-forest-400 text-sm">Smart Attendance Revolution</p>
            </div>
          </div>
          <p className="text-forest-400">
            © 2024 FaunaAttend. All rights reserved. Transforming education through intelligent attendance.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
