require("dotenv").config();


const supabase = require("../config/supabase");
const { rankAstrologers } = require("../services/matching");

async function startMCPServer() {
    // MCP v2 is ESM, so we load it dynamically
    const { McpServer } = await import("@modelcontextprotocol/server");
    const { serveStdio } = await import("@modelcontextprotocol/server/stdio");

    const z = await import("zod");

    const server = new McpServer({
        name: "astroassist",
        version: "1.0.0"
    });

    // Tool 1: Search and rank astrologers
    server.registerTool(
        
        "search_astrologers",
        {
            description:
                "Find suitable astrologers based on the user's consultation intent.",
            inputSchema: z.object({
                intent: z.string().describe(
                    "The user's consultation intent, such as career, business, finance, or relationship."
                )
            })
        },
        async ({ intent }) => {

            const { data, error } = await supabase
                .from("astrologers")
                .select("*");

            if (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Database error: ${error.message}`
                        }
                    ],
                    isError: true
                };
            }

            const rankedAstrologers = rankAstrologers(data, intent);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(rankedAstrologers, null, 2)
                    }
                ]
            };
        }
    );

        // Tool 2: Get user information
    server.registerTool(
        "get_user",
        {
            description:
                "Retrieve a user's profile information using their user ID.",
            inputSchema: z.object({
                user_id: z.string().describe(
                    "The UUID of the user to retrieve."
                )
            })
        },
        async ({ user_id }) => {

            const { data, error } = await supabase
                .from("users")
                .select("*")
                .eq("id", user_id)
                .single();

            if (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Database error: ${error.message}`
                        }
                    ],
                    isError: true
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(data, null, 2)
                    }
                ]
            };
        }
    );


    // Tool 3: Create a consultation booking
    server.registerTool(
        "create_consultation",
        {
            description:
                "Create a new astrology consultation booking for a user with an astrologer.",
            inputSchema: z.object({
                user_id: z.string().describe(
                    "UUID of the user booking the consultation."
                ),
                astrologer_id: z.string().describe(
                    "UUID of the selected astrologer."
                ),
                problem: z.string().describe(
                    "The user's consultation problem or concern."
                ),
                scheduled_at: z.string().describe(
                    "Scheduled consultation date and time in ISO 8601 format."
                )
            })
        },
        async ({
            user_id,
            astrologer_id,
            problem,
            scheduled_at
        }) => {

            const { data, error } = await supabase
                .from("consultations")
                .insert([
                    {
                        user_id,
                        astrologer_id,
                        problem,
                        scheduled_at
                    }
                ])
                .select()
                .single();

            if (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Database error: ${error.message}`
                        }
                    ],
                    isError: true
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(data, null, 2)
                    }
                ]
            };
        }
    );









    console.error("AstroAssist MCP server running");

    serveStdio(() => server);
}

startMCPServer().catch((error) => {
    console.error("MCP server failed:", error);
    process.exit(1);
});