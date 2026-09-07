async function askLLM(prompt) {
    const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "llama3.1:8b",
            prompt,
            stream: false,
            format: "json"
        })
    });

    if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
    }

    const result = await response.json();

    try {
        return JSON.parse(result.response);
    } catch (error) {
        console.error("Invalid JSON from Llama:");
        console.error(result.response);
        throw new Error("LLM returned invalid JSON");
    }
}


async function analyzeUserMessage(message) {
    return askLLM(`
You are the intent classifier for Celestial Insight.

Classify the user's main consultation intent.

Return ONLY JSON:

{
  "intent": "business",
  "summary": "short summary of the user's concern",
  "consultation_needed": true
}

intent MUST be one of:
career
relationship
finance
health
business
life_decision
other

User message:
${message}
`);
}

const { retrieveKnowledge } = require("./retrieval");

async function generateRAGResponse(question) {
    const chunks = await retrieveKnowledge(question, 3);

    const context = chunks
        .map((chunk, index) => {
            return `Source ${index + 1}: ${chunk.title}\n${chunk.content}`;
        })
        .join("\n\n");

    const prompt = `
You are the knowledge-grounded response component of Celestial Insight.

Answer the user's question using the provided knowledge context.

IMPORTANT:
- Use the context as your primary source of domain information.
- Do not invent facts that are not supported by the context.
- If the context does not contain enough information, say so.
- Keep the answer concise and understandable.

KNOWLEDGE CONTEXT:
${context}

USER QUESTION:
${question}

Return valid JSON in exactly this format:

{
  "answer": "Your answer here."
}
`;

    return askLLM(prompt);
}
module.exports = {
    askLLM,
    analyzeUserMessage,
    generateRAGResponse
};