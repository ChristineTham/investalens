/** @type {import("prettier").Config} */
module.exports = {
  semi: true,
  trailingComma: "es5",
  singleQuote: false,
  tabWidth: 2,
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./app/globals.css",
};
