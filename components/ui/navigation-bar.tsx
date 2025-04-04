"use client";

import React from "react"; // Add React import
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

const NavBar = () => {
    return (
        <div className={`navbar fixed bottom-0 left-0 w-full items-center shadow-md flex justify-around h-[10vh] border-t z-10 p-0 min-h-[20]`}>
            <NavBarItem href="/search" icon="/nav_bar_icons/Search.png" active={false} />
            <NavBarItem href="/groupslist" icon="/nav_bar_icons/Groups.png" active={false} />
            <NavBarItem href="/calendar" icon="/nav_bar_icons/Calendar.png" active={false} />
            <NavBarItem href="/settings" icon="/nav_bar_icons/Settings.png" active={false} />
            <NavBarItem href="/profile" icon="/nav_bar_icons/Profile.png" active={false} />
        </div>
    );
};

const NavBarItem = ({ href, icon, active }: { href: string; icon: string; active: boolean }) => {
    const router = useRouter();
    const isDarkMode = useState(false);

    // Dynamically change the icon based on the theme
    const iconSrc = isDarkMode ? icon.replace(".png", "-White.png") : icon;

    return (
        <Button variant={active ? "default" : "ghost"} className="justify-center flex flex-col items-center w-[4vw] h-[4vh] max-w-[400] max-h-[400] relative"
        onClick={() => router.push(href)}>
            {/* Use iconSrc */}
            <Image src={iconSrc} alt="Icon" objectFit="contain" fill className="flex object-contain w-[6vw] h-[6vh]" />
        </Button>
    );
};
export default NavBar;