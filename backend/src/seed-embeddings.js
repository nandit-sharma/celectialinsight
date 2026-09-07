require("dotenv").config();

const supabase = require("./config/supabase");
const { generateEmbedding } = require("./services/embeddings");

async function seedEmbeddings() {
    const { data: chunks, error } = await supabase
        .from("knowledge_chunks")
        .select("id, title, content");

    if (error) {
        throw new Error(`Failed to fetch chunks: ${error.message}`);
    }

    console.log(`Found ${chunks.length} knowledge chunks.`);

    for (const chunk of chunks) {
        console.log(`Generating embedding for: ${chunk.title}`);

        const embedding = await generateEmbedding(chunk.content);

        console.log(
            `Embedding dimension: ${embedding.length}`
        );

        const { error: updateError } = await supabase
            .from("knowledge_chunks")
            .update({
                embedding: embedding
            })
            .eq("id", chunk.id);

        if (updateError) {
            throw new Error(
                `Failed to update ${chunk.title}: ${updateError.message}`
            );
        }

        console.log(`✓ Stored embedding for: ${chunk.title}`);
    }

    console.log("All embeddings generated successfully.");
}

seedEmbeddings().catch((error) => {
    console.error("Embedding process failed:", error);
});