import { Button } from "@/components/shadcn/ui/button/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/shadcn/ui/sidebar/sidebar";
import { MessageCircle, MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { ImgNormalCustom } from "../../ui/image/ImgNormalCustom";
import { VersionSwitcher } from "./version-switcher";
const data = {
  versions: ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"],
  top: [
    {
      title: "New Chat",
      url: "#",
      icon: MessageSquarePlus,
    },
    {
      title: "Last Chat",
      url: "#",
      icon: MessageCircle,
    },
  ],
  recents: [
    {
      title: "React Authentication",
      url: "#",
    },
    {
      title: "Generate Landing Page",
      url: "#",
    },
    {
      title: "NestJS Clean Architecture",
      url: "#",
    },
    {
      title: "Resume Review",
      url: "#",
    },
  ],
};
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <VersionSwitcher
          versions={data.versions}
          defaultVersion={data.versions[0]}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.top.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="hover:bg-primary transition-all duration-200 "
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Recents</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {data.recents.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="hover:bg-primary transition-all duration-200 "
                  >
                    <Link href={item.url} className="ml-1  rounded-md ">
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Button className="flex justify-start hover:text-accent bg-background border border-border shadow-none">
          <ImgNormalCustom
            src={"/img/profile/avatar-4c776756.svg"}
            width={35}
            height={25}
            alt="profile"
          />
          <div className="flex flex-col ">
            <p className="text-[14px] ">Mahdi Bagheri</p>
            <p className="text-[12px] text-left">free</p>
          </div>
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
