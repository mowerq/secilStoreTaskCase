"use client";

import React from "react";
import {
  Sun,
  Moon,
  Globe,
  Bell,
  Mail,
  Settings,
  User,
  LogOut,
  Menu,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import {
  IconButton,
  Menu as MuiMenu,
  MenuItem,
  Tooltip,
  ListItemIcon,
} from "@mui/material";
import { signOut } from "next-auth/react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export const Header = React.memo(function Header({
  title,
  subtitle,
  onMenuClick,
  showMenuButton = false,
}: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleProfileMenuClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === "tr" ? "en" : "tr";
    i18n.changeLanguage(newLang);
  };

  const handleLogout = async () => {
    handleProfileMenuClose();
    await signOut({ callbackUrl: "/login", redirect: true });
  };

  // Base styling for icon buttons for consistency
  const baseIconButtonClasses = "h-9 w-9";
  const hoverClasses = "hover:bg-gray-100 dark:hover:bg-gray-700";

  return (
    <header className="h-16 md:h-20 flex items-center justify-between w-full p-3 md:p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
        {/* Mobile Menu Button */}
        {showMenuButton && (
          <IconButton
            onClick={onMenuClick}
            className={`${baseIconButtonClasses} ${hoverClasses} md:hidden`}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 dark:text-gray-300" />
          </IconButton>
        )}

        {/* Title Section */}
        {title && (
          <div className="min-w-0 flex-1">
            <h1 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs md:text-sm text-muted-foreground dark:text-gray-400 truncate hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
        {/* Theme Toggle */}
        <Tooltip title={t("header.toggleTheme")}>
          <IconButton
            onClick={toggleTheme}
            className={`${baseIconButtonClasses} ${hoverClasses}`}
            aria-label={t("header.toggleTheme")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform duration-500 ease-in-out dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform duration-500 ease-in-out dark:rotate-0 dark:scale-100 text-gray-300" />
          </IconButton>
        </Tooltip>

        {/* Language Toggle - Hidden on small screens */}
        <Tooltip title={t("header.changeLanguage")}>
          <IconButton
            onClick={toggleLanguage}
            className={`${baseIconButtonClasses} ${hoverClasses} hidden sm:flex`}
            aria-label={t("header.changeLanguage")}
          >
            <Globe className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </IconButton>
        </Tooltip>

        {/* Notifications - Hidden on small screens */}
        <Tooltip title={t("header.notifications")}>
          <IconButton
            className={`${baseIconButtonClasses} ${hoverClasses} relative hidden md:flex`}
            aria-label={t("header.notifications")}
          >
            <Bell className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            <span className="absolute -top-1 -right-1 h-4 w-4 md:h-5 md:w-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
              12
            </span>
          </IconButton>
        </Tooltip>

        {/* Messages - Hidden on small screens */}
        <Tooltip title={t("header.messages")}>
          <IconButton
            className={`${baseIconButtonClasses} ${hoverClasses} hidden lg:flex`}
            aria-label={t("header.messages")}
          >
            <Mail className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </IconButton>
        </Tooltip>

        {/* Settings - Hidden on small screens */}
        <Tooltip title={t("header.settings")}>
          <IconButton
            className={`${baseIconButtonClasses} ${hoverClasses} hidden lg:flex`}
            aria-label={t("header.settings")}
          >
            <Settings className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </IconButton>
        </Tooltip>

        {/* Profile Menu Trigger */}
        <Tooltip title={t("header.accountMenuTooltip")}>
          <IconButton
            id="profile-menu-button"
            aria-controls={menuOpen ? "profile-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={menuOpen ? "true" : undefined}
            onClick={handleProfileMenuClick}
            className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 p-0 flex items-center justify-center"
            aria-label={t("header.accountMenuTooltip")}
          >
            <User className="h-4 w-4 md:h-5 md:w-5 text-gray-700 dark:text-gray-300" />
          </IconButton>
        </Tooltip>
        <MuiMenu
          id="profile-menu"
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleProfileMenuClose}
          MenuListProps={{
            "aria-labelledby": "profile-menu-button",
          }}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
        >
          <MenuItem onClick={handleLogout}>
            <ListItemIcon sx={{ minWidth: "auto" }}>
              <LogOut className="h-4 w-4 text-gray-700" />
            </ListItemIcon>
            <span className="text-xs text-gray-700">{t("header.logout")}</span>
          </MenuItem>
        </MuiMenu>
      </div>
    </header>
  );
});
