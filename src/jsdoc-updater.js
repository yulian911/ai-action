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
  const model = ai.getGenerativeModel({model: "gemini-pro"});

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
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const updatedContent = response.text();

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
    } catch (error) {
      // Check if it's a rate limit error (429)
      if (error.message && error.message.includes("429 Too Many Requests")) {
        attempt++;
        if (attempt >= maxRetries) {
          throw new Error(
            `Failed to update JSDocs after ${maxRetries} attempts due to rate limiting. Last error: ${error.message}`
          );
        }

        // Default delay if specific value cannot be parsed
        let retryDelayMs = 60000;
        const jsonStringMatch = error.message.match(/{.*}/s);

        if (jsonStringMatch) {
          try {
            const errorDetails = JSON.parse(jsonStringMatch[0]);
            const retryInfo = errorDetails.error?.details?.find(
              detail =>
                detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
            );

            if (retryInfo && retryInfo.retryDelay) {
              const delaySeconds = parseInt(
                retryInfo.retryDelay.replace("s", ""),
                10
              );
              if (!isNaN(delaySeconds)) {
                retryDelayMs = delaySeconds * 1000;
              }
            }
          } catch (parseError) {
            console.warn(
              `Could not parse retry delay from error. Using default of ${
                retryDelayMs / 1000
              }s.`
            );
          }
        }

        console.warn(
          `Rate limit hit. Retrying in ${
            retryDelayMs / 1000
          } seconds... (Attempt ${attempt}/${maxRetries})`
        );
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      } else {
        // Not a rate limit error, re-throw immediately
        throw error;
      }
    }
  }
  // This part should not be reached if retries are exhausted and an error is thrown.
  // Adding it for type safety and to handle unexpected loop exits.
  return fileContent;
}