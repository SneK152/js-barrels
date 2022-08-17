#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const yargs_1 = __importDefault(require("yargs"));
const node_watch_1 = __importDefault(require("node-watch"));
const chalk_1 = __importDefault(require("chalk"));
const argv = yargs_1.default
    .options({
    dir: {
        alias: "d",
        demandOption: true,
        type: "string",
        description: "Directory to generate barrels for",
    },
    watch: {
        alias: "w",
        type: "boolean",
        description: "Watch and make barrels recursively",
    },
    ext: {
        alias: "e",
        type: "string",
        description: "An extension to create the barrel file with, if not provided the script will determine based on the files in the dir",
    },
})
    .parseSync();
function joinPath(...path) {
    return (0, path_1.join)(process.cwd(), ...path);
}
function makeBarrels(watch) {
    const dirFiles = (0, fs_1.readdirSync)(joinPath(argv.dir));
    const extension = argv.ext || (dirFiles.join(",").includes(".ts") ? "ts" : "js");
    const comments = `// AUTO GENERATED BY JS-BARRELS`;
    if (dirFiles.includes(`index.${extension}`)) {
        const fileContents = (0, fs_1.readFileSync)(joinPath(argv.dir, dirFiles.find((f) => f === `index.${extension}`))).toString();
        if (!fileContents.startsWith(comments)) {
            console.log(chalk_1.default.bgRed("\n ERROR "), chalk_1.default.red("Directory already contains an index file not generated by js-barrels."));
            process.exit();
        }
    }
    const e = [];
    for (const file of dirFiles) {
        console.log(file);
        const fileContents = (0, fs_1.readFileSync)(joinPath(argv.dir, file)).toString();
        if ((fileContents.includes("export") ||
            file.includes("svelte") ||
            file.includes("vue")) &&
            !file.includes("index")) {
            let stringToSearch = "export default";
            if (file.includes("svelte") || file.includes("vue")) {
                e.push({
                    default: true,
                    name: file.split(".")[0],
                    fileName: `./${file}`,
                });
            }
            else {
                if (fileContents.includes(stringToSearch)) {
                    const contents = fileContents
                        .substring(fileContents.indexOf(stringToSearch), fileContents.length)
                        .split("\n")[0];
                    const filteredContents = contents.substring(stringToSearch.length + 1, contents.length);
                    if (filteredContents.startsWith("function") ||
                        filteredContents.startsWith("interface")) {
                        let keyword = filteredContents.startsWith("function")
                            ? "function"
                            : "interface";
                        const id = filteredContents.substring(keyword.length + 1, filteredContents.length);
                        const token = keyword === "function"
                            ? id.substring(0, id.indexOf("("))
                            : id.substring(0, id.indexOf(" "));
                        e.push({
                            default: true,
                            name: token,
                            fileName: `./${file.includes("ts") || file.includes("js")
                                ? file.split(".")[0]
                                : file}`,
                        });
                    }
                }
                else {
                    e.push({
                        default: false,
                        name: "",
                        fileName: `./${file.includes("ts") || file.includes("js")
                            ? file.split(".")[0]
                            : file}`,
                    });
                }
            }
        }
    }
    const generatedFile = `${comments}
${e
        .map((ex) => ex.default
        ? `export { default as ${ex.name} } from "${ex.fileName}";`
        : `export * from "${ex.fileName}";`)
        .join("\n")}`;
    (0, fs_1.writeFileSync)(joinPath(argv.dir, `index.${extension}`), generatedFile);
    if (watch) {
        console.log(chalk_1.default.bgYellow(" FILE SAVED "), chalk_1.default.yellow("Barrel files regenerated."));
    }
    else {
        console.log("\n" + chalk_1.default.bgGreen(" SUCCESS "), chalk_1.default.green("Barrel files generated.\n"));
    }
}
if (argv.watch) {
    makeBarrels(false);
    (0, node_watch_1.default)(argv.dir, {
        recursive: false,
        filter: (f) => !f.includes("index.ts") && !f.includes("index.js"),
    }, () => {
        makeBarrels(true);
    });
}
else {
    makeBarrels(false);
}
