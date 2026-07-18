import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import jsdoc from "eslint-plugin-jsdoc";

export default defineConfig([
  jsdoc.configs['flat/recommended'],
{
  files: ["**/*.{js,mjs,cjs}"],
  plugins: { js, },
  extends: ["js/recommended"],
  languageOptions: { globals: globals.browser }
},]);
