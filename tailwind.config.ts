import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base surfaces
        ink: {
          DEFAULT: "#0B0E14",
          soft: "#0F1420",
          surface: "#131826",
          raised: "#1A2030",
          border: "#242B3D",
        },
        paper: {
          DEFAULT: "#FBFAF8",
          soft: "#F3F1EC",
          surface: "#FFFFFF",
          raised: "#F7F5F0",
          border: "#E4E1D8",
        },
        // Text
        mist: {
          DEFAULT: "#EDEFF3",
          muted: "#8A93A6",
          faint: "#5B6478",
        },
        graphite: {
          DEFAULT: "#171A21",
          muted: "#5C6270",
          faint: "#8C90A0",
        },
        // Accents
        amber: {
          DEFAULT: "#F2A65A",
          soft: "#F7C592",
          strong: "#E0863A",
        },
        teal: {
          DEFAULT: "#5FD9C2",
          soft: "#9AEADC",
          strong: "#33B79E",
        },
        coral: {
          DEFAULT: "#EF6F6C",
        },

        // ---------------------------------------------------------------
        // Semantic aliases (variables defined in app/globals.css).
        // Most tool pages use generic shadcn-style names; these map them
        // onto the palette above so both vocabularies resolve.
        // <alpha-value> keeps opacity modifiers (bg-muted/50) working.
        // ---------------------------------------------------------------
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "glow-amber":
          "radial-gradient(60% 60% at 50% 40%, rgba(242,166,90,0.20) 0%, rgba(242,166,90,0) 70%)",
        "glow-teal":
          "radial-gradient(60% 60% at 50% 40%, rgba(95,217,194,0.16) 0%, rgba(95,217,194,0) 70%)",
      },
      keyframes: {
        "waveform-breathe": {
          "0%, 100%": { transform: "scaleY(0.4)" },
          "50%": { transform: "scaleY(1)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "drift": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        drift: "drift 6s ease-in-out infinite",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;