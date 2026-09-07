require("dotenv").config();

const { generateRAGResponse } = require("./services/ai");

async function testRAG() {
    const question =
        "I'm worried about losing money in my business.";

    console.log("Question:", question);
    console.log("\nGenerating RAG response...\n");

    const result = await generateRAGResponse(question);

    console.log("AI Response:");
    console.log(result);
}

testRAG().catch((error) => {
    console.error("RAG test failed:", error);
});