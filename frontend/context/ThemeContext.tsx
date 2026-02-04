'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeColors {
    primary: string;
    primaryHover: string;
    secondary: string;
    success: string;
    danger: string;
    warning: string;
    info: string;
    background: string;
    card: string;
    border: string;
    text: string;
    textMuted: string;
    headerBg: string;
    tableHeaderBg: string;
    inputBg: string;
    readonlyBg: string;
}

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    colors: ThemeColors;
}

const lightColors: ThemeColors = {
    primary: '#4f46e5',
    primaryHover: '#4338ca',
    secondary: '#64748b',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#0ea5e9',
    background: '#f8fafc',
    card: '#ffffff',
    border: '#e2e8f0',
    text: '#1e293b',
    textMuted: '#64748b',
    headerBg: '#1e293b', // Often used for heavy contrasts or actual headers
    tableHeaderBg: '#f8fafc',
    inputBg: '#ffffff',
    readonlyBg: '#f1f5f9',
};

const darkColors: ThemeColors = {
    primary: '#6366f1', // Lighter indigo for better visibility on dark
    primaryHover: '#818cf8',
    secondary: '#94a3b8',
    success: '#34d399',
    danger: '#f87171',
    warning: '#fbbf24',
    info: '#38bdf8',
    background: '#0f172a', // Slate 900
    card: '#1e293b',      // Slate 800
    border: '#334155',    // Slate 700
    text: '#f1f5f9',      // Slate 100
    textMuted: '#94a3b8', // Slate 400
    headerBg: '#020617',  // Slate 950
    tableHeaderBg: '#1e293b',
    inputBg: '#0f172a',
    readonlyBg: '#334155',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Check local storage or system preference
        const savedTheme = localStorage.getItem('theme') as Theme;
        if (savedTheme) {
            setTheme(savedTheme);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
        }
        setMounted(true);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const colors = theme === 'light' ? lightColors : darkColors;

    // Prevent hydration mismatch by rendering nothing until mounted (or simple fallback)
    // However, for a theme provider, we often just want to render children.
    // Ideally we avoid flashing, but simple approach first.
    // We must always render the provider so children can use the hook.
    // To avoid hydration mismatch, we render with initial theme (light) and then effect updates it.


    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
            <style jsx global>{`
                body {
                    background-color: ${colors.background};
                    color: ${colors.text};
                    transition: background-color 0.3s, color 0.3s;
                }
            `}</style>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
