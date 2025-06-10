import {getOctokit} from "@actions/github";
import * as core from "@actions/core";

/**
 * Get a PR diff using the GitHub API
 * @param {Object} options Options for getting the diff
 * @param {string} options.token GitHub token
 * @param {string} options.owner Repository owner
 * @param {string} options.repo Repository name
 * @param {number|null} options.prNumber Pull request number (if applicable)
 * @returns {Promise<{diff: string, prNumber: number|null}>} The PR diff and PR number
 */
export async function getPRDiff({token, owner, repo, prNumber = null}) {
  const octokit = getOctokit(token);
  let diff;

  try {
    // Handle PR events
    if (prNumber) {
      console.log(`Getting diff for PR #${prNumber}`);

      // Get the PR diff using GitHub API
      const response = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
        mediaType: {
          format: "diff",
        },
      });

      diff = response.data;
    } else {
      // For non-PR events, get the diff between HEAD^1 and HEAD
      console.log(
        "Not a pull request event, fetching diff between HEAD^1 and HEAD"
      );

      // Use the comparison API to get the diff
      const response = await octokit.rest.repos.compareCommits({
        owner,
        repo,
        base: "HEAD~1",
        head: "HEAD",
      });

      // Format the files comparison into a diff-like format
      diff = response.data.files
        .map((file) => {
          return `diff --git a/${file.filename} b/${file.filename}
${file.patch || ""}`;
        })
        .join("\n");
    }

    return {diff, prNumber};
  } catch (error) {
    core.error(`Error getting PR diff: ${error.message}`);
    throw error;
  }
}

/**
 * Extract the PR number from the GitHub context
 * @returns {number|null} The PR number or null if not a PR
 */
export function extractPRNumber() {
  // Check if this is a PR event
  const githubRef = process.env.GITHUB_REF || "";
  const isPR =
    process.env.GITHUB_EVENT_NAME === "pull_request" ||
    process.env.GITHUB_EVENT_NAME === "pull_request_target";

  if (isPR && githubRef.startsWith("refs/pull/")) {
    // Extract PR number from refs/pull/123/merge
    const prNumber = parseInt(githubRef.split("/")[2], 10);
    return prNumber;
  }

  return null;
}

/**
 * Get the repository owner and name from the GitHub context
 * @returns {Object} Object containing owner and repo
 */
export function getRepoInfo() {
  const repository = process.env.GITHUB_REPOSITORY || "";
  const [owner, repo] = repository.split("/");

  return {owner, repo};
}

/**
 * Comment on a pull request
 * @param {Object} options Options for commenting on the PR
 * @param {string} options.token GitHub token
 * @param {string} options.owner Repository owner
 * @param {string} options.repo Repository name
 * @param {number} options.prNumber Pull request number
 * @param {string} options.body Comment body text
 * @returns {Promise<void>}
 */
export async function commentOnPR({token, owner, repo, prNumber, body}) {
  if (!prNumber) {
    console.log("Not a PR, skipping comment");
    return;
  }

  const octokit = getOctokit(token);

  try {
    console.log(`Commenting on PR #${prNumber}`);
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body,
    });
    console.log("Successfully posted comment on PR");
  } catch (error) {
    core.error(`Error commenting on PR: ${error.message}`);
    throw error;
  }
}