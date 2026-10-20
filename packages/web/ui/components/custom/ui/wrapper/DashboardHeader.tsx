"use client";

import { Button } from "@/core/components/shadcn/ui/button/button";
import { Card, CardContent } from "@/core/components/shadcn/ui/card/card";
import { formatDate } from "@/core/utils/formatDate";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

export function DashboardHeader({
  setSidebarOpen,
  sidebarOpen,
}: {
  setSidebarOpen: (open: boolean) => void;
  sidebarOpen: boolean;
}) {
  const pathname = usePathname();

  if (pathname.includes("/auth")) {
    return "";
  }
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-4 py-2 border-b border-gray-200 bg-white ">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-xl hover:bg-gray-100 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="hidden md:flex items-center gap-4 flex-1  ">
        {pathname.includes("/sick-dashboard") ? (
          ""
        ) : (
          <Card className="hidden lg:block border-0 bg-gray-50 shadow-none py-0">
            <CardContent className="p-2 px-3">
              <div className="flex gap-4 items-end text-xs ">
                <span className="text-gray-500">{formatDate(new Date())}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </header>
  );
}
