/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { ink: "#111111", paper: "#F4F0E8", hermes: "#65D39B", muted: "#AAA69E", line: "#2A2A2A" }, fontFamily: { display: ["Space Grotesk", "sans-serif"], mono: ["IBM Plex Mono", "monospace"] }, boxShadow: { brutal: "4px 4px 0 #111111" } } },
  plugins: []
};
