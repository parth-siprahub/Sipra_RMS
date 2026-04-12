/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--color-background)",
                surface: {
                    DEFAULT: "var(--color-surface)",
                    hover: "var(--color-surface-hover)",
                    active: "var(--color-surface-active)",
                },
                primary: {
                    DEFAULT: "var(--color-primary)",
                    hover: "var(--color-primary-hover)",
                },
                secondary: {
                    DEFAULT: "var(--color-secondary)",
                    hover: "var(--color-secondary-hover)",
                },
                cta: {
                    DEFAULT: "var(--color-cta)",
                    hover: "var(--color-cta-hover)",
                    text: "var(--color-cta-text)",
                },
                border: {
                    DEFAULT: "var(--color-border)",
                    hover: "var(--color-border-hover)",
                },
                text: {
                    DEFAULT: "var(--color-text)",
                    muted: "var(--color-text-muted)",
                    inverse: "var(--color-text-inverse)",
                },
                danger: {
                    DEFAULT: "var(--color-danger)",
                    bg: "var(--color-danger-bg)",
                },
                success: {
                    DEFAULT: "var(--color-success)",
                    bg: "var(--color-success-bg)",
                },
                warning: {
                    DEFAULT: "var(--color-warning)",
                    bg: "var(--color-warning-bg)",
                },
                info: {
                    DEFAULT: "var(--color-info, #3B82F6)",
                },
                status: {
                    new: "var(--status-new)",
                    submitted: "var(--status-submitted)",
                    with_admin: "var(--status-with-admin)",
                    with_client: "var(--status-with-client)",
                    interview: "var(--status-interview)",
                    selected: "var(--status-selected)",
                    onboarded: "var(--status-onboarded)",
                    rejected: "var(--status-rejected)",
                    hold: "var(--status-hold)",
                    exit: "var(--status-exit)",
                }
            },
            fontFamily: {
                heading: ["var(--font-heading)", "monospace"],
                body: ["var(--font-body)", "sans-serif"],
                mono: ["var(--font-mono)", "monospace"],
            },
            spacing: {
                xs: "var(--space-xs)",
                sm: "var(--space-sm)",
                md: "var(--space-md)",
                lg: "var(--space-lg)",
                xl: "var(--space-xl)",
                "2xl": "var(--space-2xl)",
                "3xl": "var(--space-3xl)",
                header: "var(--header-height)",
                sidebar: "var(--sidebar-width)",
                "sidebar-collapsed": "var(--sidebar-collapsed)",
            },
            borderRadius: {
                sm: "var(--radius-sm)",
                md: "var(--radius-md)",
                lg: "var(--radius-lg)",
                xl: "var(--radius-xl)",
            },
            boxShadow: {
                sm: "var(--shadow-sm)",
                md: "var(--shadow-md)",
                lg: "var(--shadow-lg)",
                xl: "var(--shadow-xl)",
            },
            zIndex: {
                header: "var(--z-header)",
                sidebar: "var(--z-sidebar)",
                dropdown: "var(--z-dropdown)",
                modal: "var(--z-modal)",
                toast: "var(--z-toast)",
            },
            transitionDuration: {
                fast: "150ms",
                base: "200ms",
                slow: "300ms",
            }
        },
    },
    plugins: [],
}
