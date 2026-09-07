require("dotenv").config();

const { retrieveKnowledge } = require("./services/retrieval");

async function testRetrieval() {
    const query =
        "I'm worried about losing money in my business.";

    console.log("Query:", query);
    console.log("\nRetrieving relevant knowledge...\n");

    const results = await retrieveKnowledge(query, 3);

    results.forEach((result, index) => {
        console.log(`--- Result ${index + 1} ---`);
        console.log("Title:", result.title);
        console.log("Category:", result.category);
        console.log("Similarity:", result.similarity);
        console.log("Content:", result.content);
        console.log();
    });
}

testRetrieval().catch((error) => {
    console.error("Retrieval test failed:", error);
});