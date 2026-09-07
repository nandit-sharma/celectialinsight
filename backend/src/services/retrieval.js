const supabase = require("../config/supabase");
const { generateEmbedding } = require("./embeddings");

async function retrieveKnowledge(query, matchCount = 3) {
    const queryEmbedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc(
        "match_knowledge_chunks",
        {
            query_embedding: queryEmbedding,
            match_count: matchCount
        }
    );

    if (error) {
        throw new Error(
            `Knowledge retrieval failed: ${error.message}`
        );
    }

    return data;
}

module.exports = {
    retrieveKnowledge
};