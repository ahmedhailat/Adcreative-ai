import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LayoutDashboard, Palette, Wand2, Images } from "lucide-react";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Brands", url: "/brands", icon: Palette },
  { title: "Creative Studio", url: "/studio", icon: Wand2 },
  { title: "Library", url: "/library", icon: Images },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar>
          <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm text-sidebar-foreground">AdCreative AI</span>
          </div>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Platform</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.url}
                        data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}
                      >
                        <Link href={item.url}>
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
