"use client";

import type React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
  ChevronDown,
  HomeIcon as House,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import { Logo } from "./logo";
import { IconButton, Drawer } from "@mui/material";
import { useTranslation } from "react-i18next";
import { selectHasAnyUnsavedChanges } from "@/app/store/slices/editCollectionSlice";

interface SidebarProps {
  isMobile?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function Sidebar({
  isMobile = false,
  isOpen = false,
  onToggle,
}: SidebarProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();

  // Check for unsaved changes across all collections
  const hasUnsavedChanges = useSelector(selectHasAnyUnsavedChanges);

  const baseLinkStyle =
    "flex items-center px-2 py-2 rounded-md text-sm transition-colors duration-150";
  const inactiveLinkStyle =
    "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:dark:text-gray-200";
  const activeLinkStyle =
    "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold";

  // Helper to determine if a link is active
  const isActive = (href: string) => pathname === href;

  // Handle navigation with unsaved changes check
  const handleNavigation = (href: string, e: React.MouseEvent) => {
    e.preventDefault();

    if (hasUnsavedChanges && !pathname.startsWith(href)) {
      window.dispatchEvent(
        new CustomEvent("navigation-attempt", {
          detail: { href },
        })
      );
    } else {
      router.push(href);
      if (isMobile && onToggle) {
        onToggle();
      }
    }
  };

  const SidebarContent = () => (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      <div className="h-20 flex justify-center items-center border-b border-gray-200 dark:border-gray-700">
        <Logo size={24} />
      </div>
      <nav className="flex-grow px-4 py-4 space-y-4">
        <div>
          <h2 className="mb-2 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {t("sidebar.menuGroup")}
          </h2>
          <ul className="space-y-1">
            <li>
              <a
                href="#"
                className={`${baseLinkStyle} ${
                  isActive("/dashboard") ? activeLinkStyle : inactiveLinkStyle
                }`}
              >
                <House size={20} className="mr-3 flex-shrink-0" />
                <span className="flex-grow">{t("sidebar.dashboard")}</span>
              </a>
            </li>
            <li className="mt-1">
              <span
                className={`${baseLinkStyle} ${inactiveLinkStyle} justify-between`}
              >
                <div className="flex items-center">
                  <ShoppingBag size={20} className="mr-3 flex-shrink-0" />
                  <span className="flex-grow">{t("sidebar.products")}</span>
                </div>
                <IconButton
                  size="small"
                  className="text-gray-700 dark:text-gray-300! hover:bg-gray-800 dark:hover:bg-gray-100! dark:hover:text-gray-700! p-1"
                >
                  <ChevronDown size={16} />
                </IconButton>
              </span>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="mt-4 mb-2 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {t("sidebar.salesGroup")}
          </h2>
          <ul className="space-y-1">
            <li>
              <a
                href="/collections"
                onClick={(e) => handleNavigation("/collections", e)}
                className={`${baseLinkStyle} ${
                  isActive("/collections") ? activeLinkStyle : inactiveLinkStyle
                }`}
              >
                <ShoppingCart size={20} className="mr-3 flex-shrink-0" />
                <span className="flex-grow">{t("sidebar.collections")}</span>
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer
        anchor="left"
        open={isOpen}
        onClose={onToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          "& .MuiDrawer-paper": {
            width: 256,
            boxSizing: "border-box",
          },
        }}
      >
        <SidebarContent />
      </Drawer>
    );
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col dark:bg-gray-800 dark:border-gray-700">
      <SidebarContent />
    </aside>
  );
}
