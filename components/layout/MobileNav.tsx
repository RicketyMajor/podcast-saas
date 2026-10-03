"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

import { AuthButton } from "@/components/layout/AuthButton";
import { Logo } from "@/components/layout/Logo";
import { NavLinks } from "@/components/layout/NavLinks";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-foreground/8 bg-background/70 px-4 backdrop-blur-2xl backdrop-saturate-150 lg:hidden">
      <Logo />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-11"
            aria-label="Abrir menú"
          >
            <Menu aria-hidden />
          </Button>
        </SheetTrigger>
        {/* Own close button: shadcn's default one is labelled in English. */}
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-72 gap-8 border-foreground/8 bg-background/85 px-4 py-5 backdrop-blur-2xl"
        >
          <div className="flex items-center justify-between pl-3">
            <SheetTitle asChild>
              <span>
                <Logo />
              </span>
            </SheetTitle>
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="size-11"
                aria-label="Cerrar menú"
              >
                <X aria-hidden />
              </Button>
            </SheetClose>
          </div>
          <nav aria-label="Principal" className="flex-1">
            <NavLinks onNavigate={close} />
          </nav>
          <AuthButton onNavigate={close} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
