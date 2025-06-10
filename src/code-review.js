import {GoogleGenAI} from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

/**
 * Performs an AI code review on a PR diff using Google's Gemini model
 * @param {string} prDiff The PR diff to review
 * @param {string} apiKey Google AI API key
 * @returns {Promise<string>} The AI review feedback
 */
export async function performAICodeReview(prDiff, apiKey) {
  if (!prDiff) {
    throw new Error("PR diff is empty or not provided");
  }

  if (!apiKey) {
    throw new Error("Google API key is required");
  }

  const ai = new GoogleGenAI({apiKey});

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `
        You are a senior software engineer reviewing a pull request.
        Conduct a thorough review of the PR based on provided diff.

        The PR diff is:

        <diff>
        ${prDiff}
        </diff>

        Focus on the following:
        - Code readability - is the code easy to understand?
        - Code performance - is the code efficient?
        - Code style - is the code style consistent?
        - Code duplication - is the code duplicated?
        - Code quality - is the code of high quality?

        You are allowed to use "N/A" for cases where the PR does not bring any changes in given area.
        `,
    });

    return response.text;
  } catch (error) {
    console.error("Error during AI review:", error);
    throw error;
  }
}