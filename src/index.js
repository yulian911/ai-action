import * as core from "@actions/core";
import * as fs from "fs";
import {
  getPRDiff,
  extractPRNumber,
  getRepoInfo,
  commentOnPR,
} from "./github-utils.js";
import {performAICodeReview} from "./code-review.js";

/**
 * Main function that orchestrates the PR diff retrieval and AI review
 */
async function run() {
  try {
    // Get inputs and context
    const githubToken = process.env.GITHUB_TOKEN;
    const googleApiKey = process.env.GOOGLE_API_KEY;

    if (!githubToken) {
      throw new Error("GITHUB_TOKEN is required");
    }

    if (!googleApiKey) {
      throw new Error("GOOGLE_API_KEY is required");
    }

    // Get PR details
    const prNumber = extractPRNumber();
    const {owner, repo} = getRepoInfo();

    // Set PR_NUMBER in the environment for the comment step
    if (prNumber) {
      console.log(`PR number: ${prNumber}`);
    }

    // Get the PR diff
    const {diff} = await getPRDiff({
      token: githubToken,
      owner,
      repo,
      prNumber,
    });

    // Perform AI review
    const reviewText = await performAICodeReview(diff, googleApiKey);

    // Comment on the PR with the review
    if (prNumber) {
      await commentOnPR({
        token: githubToken,
        owner,
        repo,
        prNumber,
        body: `## AI Review Feedback:\n\n${reviewText}`,
      });
    } else {
      // Log the review if not a PR
      console.log("AI Review Feedback:");
      console.log(reviewText);
    }

    console.log("AI review completed successfully");
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
    console.error(error);
  }
}

// Run the main function
run();