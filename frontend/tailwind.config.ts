import type { Config } from "tailwindcss"
import tailwindcssAnimate from "tailwindcss-animate"

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "sans-serif"],
        display: ["Outfit", "Inter", "ui-sans-serif", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        ring: "hsl(var(--ring))",
        // Glow colors
        glow: {
          cyan: "hsl(var(--glow-cyan))",
          emerald: "hsl(var(--glow-emerald))",
          purple: "hsl(var(--glow-purple))",
          amber: "hsl(var(--glow-amber))",
          rose: "hsl(var(--glow-rose))",
          blue: "hsl(var(--glow-blue))",
          violet: "hsl(var(--glow-violet))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        dock: "0 24px 80px -30px rgba(0, 0, 0, 0.7)",
        glow: "0 0 20px hsl(var(--glow-cyan) / 0.3), 0 0 40px hsl(var(--glow-cyan) / 0.2)",
        "glow-lg": "0 0 30px hsl(var(--glow-cyan) / 0.4), 0 0 60px hsl(var(--glow-cyan) / 0.3), 0 0 90px hsl(var(--glow-cyan) / 0.2)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-left": {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "fade-in-right": {
          "0%": { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "bounce-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        spin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        "typing-dot": {
          "0%, 100%": { opacity: "0.3", transform: "scale(0.8)" },
          "50%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 500ms ease-out both",
        "fade-in-down": "fade-in-down 500ms ease-out both",
        "fade-in-left": "fade-in-left 500ms ease-out both",
        "fade-in-right": "fade-in-right 500ms ease-out both",
        "scale-in": "scale-in 300ms ease-out both",
        "slide-up": "slide-up 400ms ease-out both",
        "slide-down": "slide-down 400ms ease-out both",
        shimmer: "shimmer 1.5s infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "bounce-soft": "bounce-soft 2s ease-in-out infinite",
        spin: "spin 1s linear infinite",
        wiggle: "wiggle 1s ease-in-out infinite",
        "typing-dot": "typing-dot 1.4s ease-in-out infinite",
      },
      transitionTimingFunction: {
        "spring": "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        "smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
        "bounce": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config
