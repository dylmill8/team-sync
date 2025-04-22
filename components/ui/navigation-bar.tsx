"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext"; // Import ThemeContext

const NavBar = () => {
    const { isLightMode } = useTheme(); // Use ThemeContext to track theme changes

    return (
        <div className="navbar fixed bottom-0 left-0 w-full items-center shadow-md flex justify-around h-[10vh] border-t z-10 p-0">
            <NavBarItem href="/search" icon="/nav_bar_icons/Search.png" isLightMode={isLightMode} />
            <NavBarItem href="/groupslist" icon="/nav_bar_icons/Groups.png" isLightMode={isLightMode} />
            <NavBarItem href="/calendar" icon="/nav_bar_icons/Calendar.png" isLightMode={isLightMode} />
            <NavBarItem href="/settings" icon="/nav_bar_icons/Settings.png" isLightMode={isLightMode} />
            <NavBarItem href="/profile" icon="/nav_bar_icons/Profile.png" isLightMode={isLightMode} />
        </div>
    );
};

const NavBarItem = ({ href, icon, isLightMode }: { href: string; icon: string; isLightMode: boolean }) => {
    const router = useRouter();
    const iconSrc = isLightMode ? icon : icon.replace(".png", "-White.png");

    return (
        <Button
            variant="ghost"
            className="relative flex justify-center items-center aspect-square h-[60%]"
            onClick={() => router.push(href)}
        >
            <Image
                src={iconSrc}
                alt="Icon"
                fill
                className="object-contain"
            />
        </Button>
    );
};

export default NavBar;