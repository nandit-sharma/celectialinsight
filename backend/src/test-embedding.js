async function testEmbedding() {
    const response = await fetch("http://localhost:11434/api/embed", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "nomic-embed-text",
            input: "This is a test sentence."
        })
    });

    const result = await response.json();

    console.log("Embedding dimensions:", result.embeddings[0].length);
}

testEmbedding();