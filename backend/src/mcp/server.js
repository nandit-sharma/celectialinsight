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
                intents: z.array(z.string()).describe(
                    "The user's consultation intents, such as career, business, finance, or relationship."
                )
            })
        },
        async ({ intents }) => {

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

            const rankedAstrologers = rankAstrologers(data, intents);

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
    server.registerTool(
    "cancel_consultation",
    {
        description:
            "Cancel a scheduled consultation using its consultation ID.",
        inputSchema: z.object({
            consultation_id: z.string().describe(
                "UUID of the consultation to cancel."
            )
        })
    },
    async ({ consultation_id }) => {

        const { data, error } = await supabase
            .from("consultations")
            .update({
                status: "cancelled"
            })
            .eq("id", consultation_id)
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
    server.registerTool(
    "get_active_consultations",
    {
        description:
            "Retrieve all active consultations for a user.",
        inputSchema: z.object({
            user_id: z.string().describe(
                "UUID of the user whose active consultations should be retrieved."
            )
        })
    },
    async ({ user_id }) => {

        const { data, error } = await supabase
            .from("consultations")
            .select(`
                *,
                astrologers(name, specialization)
            `)
            .eq("user_id", user_id)
            .eq("status", "pending")
            .order("scheduled_at", { ascending: true });

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