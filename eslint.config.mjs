import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import jsdoc from "eslint-plugin-jsdoc";
import mochaPlugin from "eslint-plugin-mocha";

export default defineConfig([
  mochaPlugin.configs.recommended,
  jsdoc.configs['flat/recommended'],
{
  files: ["**/*.{js,mjs,cjs}"],
  plugins: { js, },
  extends: ["js/recommended"],
  languageOptions: { globals: globals.browser }
},]);
