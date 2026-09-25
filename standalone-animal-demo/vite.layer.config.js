import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    outDir: "dist-layer",
    lib: { entry: "src/index.js", formats: ["es"], fileName: "animal-layer" },
  },
});
