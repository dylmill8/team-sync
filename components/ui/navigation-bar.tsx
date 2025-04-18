"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext"; // Import ThemeContext

const NavBar = () => {
    const { isLightMode } = useTheme(); // Use ThemeContext to track theme changes

    return (
        <div className="navbar fixed bottom-0 left-0 w-full items-center shadow-md flex justify-around h-[10vh] border-t z-10 p-0 min-h-[20]">
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

    // Dynamically change the icon based on the theme
    const iconSrc = isLightMode ? icon : icon.replace(".png", "-White.png");

    return (
        <Button
            variant="ghost"
            className="justify-center flex flex-col items-center w-[4vw] h-[4vh] min-w-[70] min-h-[70] max-w-[400] max-h-[400] relative"
            onClick={() => router.push(href)}
        >
            <Image
                src={iconSrc}
                alt="Icon"
                width={24} // Explicit width to ensure proper rendering
                height={24} // Explicit height to ensure proper rendering
                className="object-contain"
            />
        </Button>
    );
};

export default NavBar;