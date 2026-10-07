// Tailwind (CDN) theme shared by every page. Load right after https://cdn.tailwindcss.com.
// Palette: white · navy (uniform cloth) · lemon (the brand's name) · cream. Mirrors :root in /css/site.css.
tailwind.config = {
    theme: {
        extend: {
            colors: {
                navy: { DEFAULT: '#14213d', 900: '#0d1629', 700: '#22325a', 500: '#4a5875', 400: '#5d6880', line: '#e4e6ec' },
                lemon: { 50: '#fffbea', 100: '#fdf3c4', 300: '#f7e07a', 400: '#f4d35e', 600: '#c9a72a' },
                cream: '#faf7ee',
            },
            fontFamily: {
                display: ['"DM Serif Display"', 'Georgia', 'serif'],
                sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
            },
        },
    },
};
