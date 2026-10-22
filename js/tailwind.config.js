// Tailwind (CDN) theme shared by every page. Load right after https://cdn.tailwindcss.com.
// Palette: paper (unbleached cotton) · ink · lemon (the brand's name) · olive · clay. Mirrors :root in css/site.css.
tailwind.config = {
    theme: {
        extend: {
            colors: {
                paper: { DEFAULT: '#f4f0e6', 2: '#ebe5d6', 3: '#e0d8c4' },
                ink: { DEFAULT: '#171614', 2: '#55524b', 3: '#8a857a', line: 'rgba(23,22,20,.14)' },
                lemon: { DEFAULT: '#ecdf3f', 100: '#f8f2b8', 600: '#b9ad12' },
                olive: { DEFAULT: '#3f4a2f', 2: '#5d6b47' },
                clay: '#c65d3b',
            },
            fontFamily: {
                display: ['Fraunces', 'Georgia', 'serif'],
                sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
            },
        },
    },
};
