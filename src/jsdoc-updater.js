import {GoogleGenAI} from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

/**
 * Updates JSDoc comments in a given JavaScript file content using Google's Gemini model.
 * @param {string} fileContent The content of the JavaScript file.
 * @param {string} apiKey Google AI API key.
 * @returns {Promise<string>} The updated file content with synced JSDoc comments.
 */
export async function updateJSDocs(fileContent, apiKey) {
  if (!fileContent) {
    // Consider returning original content or throwing a more specific error
    console.warn(
      "File content is empty or not provided. Skipping JSDoc update."
    );
    return fileContent;
  }

  if (!apiKey) {
    throw new Error("Google API key is required");
  }

  // Initialize Google AI
  const ai = new GoogleGenAI({apiKey});

  // Updated prompt:
  const prompt = `
You are an AI assistant specialized in JavaScript documentation.
Your task is to analyze the provided JavaScript code and ensure JSDoc comments are present and accurate for functions, classes, and complex logic blocks. Do not comment self-explanatory code or one-liners.

**Instructions:**
1.  **Add missing JSDocs:** If a function, class, or significant logic block lacks documentation, add a complete JSDoc comment.
2.  **Fix broken JSDocs:** If an existing JSDoc comment is fundamentally incorrect (e.g., wrong parameter names, incorrect return type description, misleading description), update it to be accurate.
3.  **Do NOT make minor changes:** If JSDoc comments exist and are generally correct, do *not* modify them for minor rewording, style adjustments, or typo fixes.
4.  **Preserve Code:** Ensure the underlying JavaScript code logic remains completely unchanged.
5.  **Output:** Return the *entire* file content. If you made changes according to rules 1 or 2, return the modified content. If no changes were needed according to rule 3, return the original, unmodified content.
6.  **Format:** Output *only* the raw code content, without any markdown fences (like \`\`\`javascript) or explanations.

JavaScript code:
\`\`\`javascript
${fileContent}
\`\`\`
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });
  const updatedContent = response.text;

  // Basic validation: Check if the response looks like code
  if (
    !updatedContent ||
    (!updatedContent.includes("function") &&
      !updatedContent.includes("class") &&
      !updatedContent.includes("const") &&
      !updatedContent.includes("let"))
  ) {
    console.warn(
      "AI response did not seem like valid code. Returning original content."
    );
    return fileContent; // Return original content if response is suspicious
  }

  // Clean up potential markdown code fences if the model added them
  const cleanedContent = updatedContent
    .replace(/^```javascript\n/, "")
    .replace(/\n```$/, "");

  return cleanedContent;
}