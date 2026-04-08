"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
    const { setTheme } = useTheme()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative min-h-10 min-w-10 rounded-full border-border/80 bg-background/80 shadow-sm backdrop-blur-xl transition-all hover:bg-accent">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 text-foreground/80 transition-all dark:-rotate-90 dark:scale-0 dark:text-foreground/80" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 text-foreground/65 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40 border-border/70 bg-popover/95 backdrop-blur-xl">
                <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
                    Chiaro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
                    Scuro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
                    Sistema
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
