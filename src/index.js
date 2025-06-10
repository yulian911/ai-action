import * as core from "@actions/core";
import * as fs from "fs/promises"; // Use promises version of fs
import * as path from "path"; // Import path module
import {updateJSDocs} from "./jsdoc-updater.js"; // Import the new updater

/**
 * Recursively finds files in a directory matching the allowed extensions,
 * excluding specified directories.
 * @param {string} dir The directory to start searching from.
 * @param {Set<string>} allowedExtensions Set of allowed file extensions (e.g., new Set(['.js', '.jsx'])).
 * @param {Set<string>} excludedDirs Set of directory names to exclude.
 * @returns {Promise<string[]>} A list of matching file paths.
 */
async function findFilesRecursive(dir, allowedExtensions, excludedDirs) {
  let filesFound = [];
  try {
    const entries = await fs.readdir(dir, {withFileTypes: true});
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (excludedDirs.has(entry.name)) {
        // Skip excluded directories
        continue;
      }
      if (entry.isDirectory()) {
        // Recurse into subdirectories
        filesFound = filesFound.concat(
          await findFilesRecursive(fullPath, allowedExtensions, excludedDirs)
        );
      } else if (entry.isFile()) {
        // Check file extension
        const ext = path.extname(entry.name);
        if (allowedExtensions.has(ext)) {
          filesFound.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Log errors like permission issues but don't halt the whole process
    core.warning(`Could not read directory ${dir}: ${error.message}`);
  }
  return filesFound;
}

/**
 * Main function that orchestrates finding files, updating JSDocs, and writing changes.
 */
async function run() {
  try {
    // Get inputs
    const googleApiKey = process.env.GOOGLE_API_KEY;
    const fileExtensionsInput = process.env.FILE_EXTENSIONS || ".js";
    const excludedDirsInput =
      process.env.EXCLUDED_DIRS || "node_modules,.git,dist";

    if (!googleApiKey) {
      throw new Error(
        "GOOGLE_API_KEY is required. Please add it to your action's environment secrets."
      );
    }

    // Parse inputs
    const allowedExtensions = new Set(
      fileExtensionsInput
        .split(",")
        .map((ext) => ext.trim())
        .filter(Boolean)
    );
    const excludedDirs = new Set(
      excludedDirsInput
        .split(",")
        .map((dir) => dir.trim())
        .filter(Boolean)
    );

    console.log(
      `Allowed file extensions: ${[...allowedExtensions].join(", ")}`
    );
    console.log(`Excluded directories: ${[...excludedDirs].join(", ")}`);

    // Find files recursively starting from the current directory ('.')
    const files = await findFilesRecursive(
      ".",
      allowedExtensions,
      excludedDirs
    );

    if (files.length === 0) {
      console.log("No files found matching the criteria. Exiting.");
      return;
    }

    console.log(`Found ${files.length} files to process.`);

    let filesUpdatedCount = 0; // Renamed for clarity
    const updatedFilesList = []; // Array to hold paths of updated files

    // Process each file
    for (const filePath of files) {
      console.log(`Processing file: ${filePath}...`);
      try {
        const originalContent = await fs.readFile(filePath, "utf8");

        // Get updated content from AI
        const updatedContent = await updateJSDocs(
          originalContent,
          googleApiKey
        );

        // Compare and write if changed
        if (originalContent !== updatedContent) {
          await fs.writeFile(filePath, updatedContent, "utf8");
          console.log(`  Updated JSDocs in: ${filePath}`);
          filesUpdatedCount++;
          updatedFilesList.push(filePath); // Add to the list
        } else {
          console.log(`  No changes needed for: ${filePath}`);
        }
      } catch (fileError) {
        // Log error for specific file but continue with others
        core.error(`Failed to process file ${filePath}: ${fileError.message}`);
        console.error(`Error details for ${filePath}:`, fileError);
      }
    }

    console.log(`
JSDoc update process completed.`);
    console.log(`Total files processed: ${files.length}`);
    console.log(`Total files updated: ${filesUpdatedCount}`); // Use renamed variable

    // Set outputs
    core.setOutput("files-updated-count", filesUpdatedCount); // Output the count
    core.setOutput("updated-files-list", updatedFilesList.join(",")); // Output comma-separated list
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
    console.error("Action error details:", error);
  }
}

// Run the main function
run();