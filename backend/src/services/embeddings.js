async function generateEmbedding(text) {
    const response = await fetch(
        "http://localhost:11434/api/embed",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "nomic-embed-text",
                input: text
            })
        }
    );

    if (!response.ok) {
        throw new Error(
            `Ollama embedding error: ${response.status}`
        );
    }

    const result = await response.json();

    return result.embeddings[0];
}

module.exports = {
    generateEmbedding
};