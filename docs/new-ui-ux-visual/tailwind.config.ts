import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "rgb(var(--brand-blue) / <alpha-value>)",
          orange: "rgb(var(--brand-orange) / <alpha-value>)",
          white: "rgb(var(--brand-white) / <alpha-value>)",
        },

        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",

        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
        },

        popover: {
          DEFAULT: "rgb(var(--popover) / <alpha-value>)",
          foreground: "rgb(var(--popover-foreground) / <alpha-value>)",
        },

        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        },

        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
        },

        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },

        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
        },

        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",

        surface: {
          1: "rgb(var(--surface-1) / <alpha-value>)",
          2: "rgb(var(--surface-2) / <alpha-value>)",
          3: "rgb(var(--surface-3) / <alpha-value>)",
          hover: "rgb(var(--surface-hover) / <alpha-value>)",
          active: "rgb(var(--surface-active) / <alpha-value>)",
        },

        sidebar: {
          DEFAULT: "rgb(var(--sidebar) / <alpha-value>)",
          foreground: "rgb(var(--sidebar-foreground) / <alpha-value>)",
          border: "rgb(var(--sidebar-border) / <alpha-value>)",
        },

        success: {
          DEFAULT: "rgb(var(--success) / <alpha-value>)",
          foreground: "rgb(var(--success-foreground) / <alpha-value>)",
        },

        warning: {
          DEFAULT: "rgb(var(--warning) / <alpha-value>)",
          foreground: "rgb(var(--warning-foreground) / <alpha-value>)",
        },

        destructive: {
          DEFAULT: "rgb(var(--destructive) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground) / <alpha-value>)",
        },

        info: {
          DEFAULT: "rgb(var(--info) / <alpha-value>)",
          foreground: "rgb(var(--info-foreground) / <alpha-value>)",
        },

        disabled: {
          bg: "rgb(var(--disabled-bg) / <alpha-value>)",
          fg: "rgb(var(--disabled-fg) / <alpha-value>)",
        },

        selection: {
          DEFAULT: "rgb(var(--selection) / <alpha-value>)",
          foreground: "rgb(var(--selection-foreground) / <alpha-value>)",
        },

        overlay: "rgb(var(--overlay) / <alpha-value>)",

        chart: {
          1: "rgb(var(--chart-1) / <alpha-value>)",
          2: "rgb(var(--chart-2) / <alpha-value>)",
          3: "rgb(var(--chart-3) / <alpha-value>)",
          4: "rgb(var(--chart-4) / <alpha-value>)",
          5: "rgb(var(--chart-5) / <alpha-value>)",
        },
      },

      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },

      boxShadow: {
        soft: "var(--shadow-soft)",
        card: "var(--shadow-card)",
        modal: "var(--shadow-modal)",
      },
    },
  },
  plugins: [],
};

export default config;
