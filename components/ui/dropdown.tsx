"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils"; // Utility function for conditional class names

export const DropdownMenu = DropdownMenuPrimitive.Root;

export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export const DropdownMenuContent = ({
  className,
  ...props
}: DropdownMenuPrimitive.MenuContentProps) => (
  <DropdownMenuPrimitive.Content
    className={cn(
      "bg-white dark:bg-gray-800 shadow-md rounded-md p-2 border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto",
      className
    )}
    {...props}
  />
);

export const DropdownMenuItem = ({
  className,
  ...props
}: DropdownMenuPrimitive.MenuItemProps) => (
  <DropdownMenuPrimitive.Item
    className={cn(
      "px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer",
      className
    )}
    {...props}
  />
);
