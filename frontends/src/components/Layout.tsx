
import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface LayoutProps {
  children: ReactNode;
  setIsAuthenticated?: (value: boolean) => void;
}

const Layout = ({ children, setIsAuthenticated }: LayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-forest-50 to-earth-50 nature-pattern">
        <AppSidebar setIsAuthenticated={setIsAuthenticated} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
