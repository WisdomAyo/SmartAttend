
import {
  BookOpen,
  Camera,
  Settings,
  Users,
  BarChart3,
  LogOut,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "Courses",
    url: "/courses",
    icon: BookOpen,
  },
  {
    title: "Students",
    url: "/students",
    icon: Users,
  },
  {
    title: "Take Attendance",
    url: "/take-attendance",
    icon: Camera,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

interface AppSidebarProps {
  setIsAuthenticated?: (value: boolean) => void;
}

export function AppSidebar({ setIsAuthenticated }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    if (setIsAuthenticated) {
      setIsAuthenticated(false);
    }
    navigate('/');
    toast({
      title: "Logged out successfully",
      description: "You have been logged out of your account.",
    });
  };

  return (
    <Sidebar className="border-r border-forest-200 bg-forest-900 text-forest-100">
      <SidebarHeader className="border-b border-forest-700 p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-forest-gradient rounded-xl flex items-center justify-center animate-pulse-glow">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">SmartAttend</h2>
            <p className="text-forest-300 text-sm">Smart Attendance</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-4 py-6">
        <SidebarGroup>
          <SidebarGroupLabel className="text-forest-400 text-xs font-semibold uppercase tracking-wider mb-4">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={`w-full rounded-lg transition-all duration-200 ${
                      location.pathname === item.url
                        ? "bg-forest-700 text-white border border-forest-600"
                        : "text-forest-300 hover:bg-forest-800 hover:text-white"
                    }`}
                  >
                    <button
                      onClick={() => navigate(item.url)}
                      className="flex items-center space-x-3 p-3 w-full text-left"
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-forest-700">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full border-forest-600 text-forest-800 hover:bg-forest-500 hover:text-white hover:border-forest-500"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
