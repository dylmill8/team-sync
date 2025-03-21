"use client";

import NavBar from "@/components/ui/navigation-bar";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Groups() {
    return (
        <>
            <div>
                <h1>LIST OF GROUPS (COMING SOON...)</h1>
                <Link href="groups">
                    <Button variant="default">
                        EXAMPLE GROUP
                    </Button>
                </Link>
            </div>
            <NavBar/>
        </>
    );
}