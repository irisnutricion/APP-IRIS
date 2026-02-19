/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
            },
            colors: {
                // Mapping the Green Brand Colors to 'primary'
                primary: {
                    50: '#f4fcf8',
                    100: '#e3f6ed',
                    200: '#c6ebd9',
                    300: '#9adbbd',
                    400: '#66c29b',
                    500: '#3ea07a',
                    600: '#2b8462',
                    700: '#28483a', // Brand Base
                    800: '#225142',
                    900: '#1e4338',
                    950: '#0f2720',
                },
                secondary: {
                    DEFAULT: '#d09a84', // Keeping the secondary earth tone
                    50: '#fbf6f4',
                    100: '#f5ebe7',
                    200: '#ebd6cd',
                    300: '#dfc0b3',
                    400: '#d09a84',
                    500: '#bf7d64',
                    600: '#a6624a',
                    700: '#8a4f3b',
                    800: '#734335',
                    900: '#603a30',
                }
            }
        },
    },
    plugins: [],
}
