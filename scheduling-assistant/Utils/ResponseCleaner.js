export function extractCleanJsonFromAiReply(reply) {
  // Remove Markdown-style ```json blocks
  reply = reply.replace(/```json/g, "").replace(/```/g, "");

  // Try to locate the first [ and last ] (for arrays)
  const jsonStart = reply.indexOf("[");
  const jsonEnd = reply.lastIndexOf("]");

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("Could not find valid JSON array in the response.");
  }

  // Extract potential JSON array string
  let jsonStr = reply.substring(jsonStart, jsonEnd + 1);

  // Convert single quotes to double quotes (sometimes used by GPT mistakenly)
  jsonStr = jsonStr.replace(/'/g, '"');

  return jsonStr;
}
