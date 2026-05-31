"use client";

import { useState } from "react";

import NavLinks from "./NavLinks";
import UserProfileDropdown from "./UserProfileDropdown";

export default function AppNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative flex justify-between items-center px-6 py-4 border-b">
      <NavLinks />

      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="
            flex
            items-center
            gap-3
            rounded-full
            border
            px-4
            py-2
            hover:bg-neutral-100
            transition
          "
        >
          <div className="h-8 w-8 rounded-full bg-neutral-300" />

          <span className="text-sm font-medium">
            Adrian
          </span>

          <span>▼</span>
        </button>

        {open && (
          <UserProfileDropdown
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    </header>
  );
}