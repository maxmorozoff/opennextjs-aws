import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { execSync } from "child_process";
import type { InstallOptions } from "types/open-next";

import logger from "../logger.js";

export function installDependencies(
  outputDir: string,
  installOptions?: InstallOptions,
) {
  try {
    if (!installOptions) {
      return;
    }
    const name = outputDir.split("/").pop();
    // First we create a tempDir
    const tempInstallDir = fs.mkdtempSync(
      path.join(os.tmpdir(), `open-next-install-${name}`),
    );
    logger.info(`Installing dependencies for ${name}...`);
    // We then need to run install in the tempDir
    // We don't install in the output dir directly because it could contain a package.json, and npm would then try to reinstall not complete deps from tracing the files
    const archOption = installOptions.arch
      ? `--arch=${installOptions.arch}`
      : "";
    const targetOption = installOptions.nodeVersion
      ? `--target=${installOptions.nodeVersion}`
      : "";
    const libcOption = installOptions.libc
      ? `--libc=${installOptions.libc}`
      : "";

    const additionalArgs = installOptions.additionalArgs ?? "";
    const installCommand = `npm install --platform=linux ${archOption} ${targetOption} ${libcOption} ${additionalArgs} ${installOptions.packages.join(" ")}`;
    execSync(installCommand, {
      stdio: "pipe",
      cwd: tempInstallDir,
      env: {
        ...process.env,
        SHARP_IGNORE_GLOBAL_LIBVIPS: "1",
      },
    });

    // Copy the node_modules to the outputDir
    fs.cpSync(
      path.join(tempInstallDir, "node_modules"),
      path.join(outputDir, "node_modules"),

      { recursive: true, force: true, dereference: true },
    );

    // Cleanup tempDir
    fs.rmSync(tempInstallDir, { recursive: true, force: true });
    logger.info(`Dependencies installed for ${name}`);
  } catch (e: any) {
    logger.error(e.stdout.toString());
    logger.error("Could not install dependencies");
  }
}
