"use client";

import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import type React from "react";
import { useMemo, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

interface PageInfo {
  title: string;
  subtitle: string;
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check if screen is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const pageInfo = useMemo((): PageInfo => {
    if (pathname === "/collections") {
      return {
        title: t("pageTitles.collections.title"),
        subtitle: t("pageTitles.collections.subtitle"),
      };
    }
    if (pathname === "/dashboard") {
      return { title: "Dashboard", subtitle: "I will not implement this so.." };
    }
    if (pathname.startsWith("/edit/")) {
      return {
        title: t("pageTitles.editCollection.title"),
        subtitle: t("pageTitles.editCollection.subtitle"),
      };
    }
    return {
      title: "Some Title It Doesn't Matter For This Case",
      subtitle: "Some Subtitle It Doesn't Matter For This Case",
    };
  }, [pathname, t]);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      {!isMobile && <Sidebar />}

      {/* Mobile Sidebar */}
      {isMobile && (
        <Sidebar
          isMobile={true}
          isOpen={sidebarOpen}
          onToggle={handleSidebarToggle}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
          onMenuClick={handleSidebarToggle}
          showMenuButton={isMobile}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-3 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
