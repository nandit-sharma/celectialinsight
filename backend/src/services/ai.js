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


module.exports = {
    askLLM,
    analyzeUserMessage
};