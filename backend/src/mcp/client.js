require("dotenv").config();

const readline = require("readline");
const { askLLM } = require("../services/ai");
const TEST_USER_ID = process.env.TEST_USER_ID;

// --------------------------------------------------
// CONVERSATION STATE
// --------------------------------------------------

const conversationState = {
    intents: [],
    selectedAstrologer: null,
    selectedAstrologerId: null,
    scheduledAt: null,
    problem: null,
    stage: "initial"
};


// --------------------------------------------------
// CREATE MCP CLIENT
// --------------------------------------------------

async function createMCPClient() {
    const { Client } = await import("@modelcontextprotocol/client");

    const { StdioClientTransport } = await import(
        "@modelcontextprotocol/client/stdio"
    );

    const client = new Client({
        name: "celestial-insight-agent",
        version: "1.0.0"
    });

    const transport = new StdioClientTransport({
        command: "node",
        args: ["src/mcp/server.js"]
    });

    await client.connect(transport);

    return client;
}


// --------------------------------------------------
// MAIN AGENT
// --------------------------------------------------

async function runAgent(userMessage) {

    const client = await createMCPClient();

    console.log("\nAgent started.");
    console.log("User:", userMessage);


    // --------------------------------------------------
    // STAGE 1: INITIAL USER MESSAGE
    // --------------------------------------------------

    if (conversationState.stage === "initial") {

        const analysis = await askLLM(`
You are the intent analysis component of Celestial Insight.

Analyze the user's message and identify ALL relevant reasons
why they may want an astrology consultation.

A user can have MORE THAN ONE relevant intent.

Possible intents:

career
business
finance
relationship
health
life_decision
other

Rules:

- career = job, profession, promotion, workplace, career path
- business = company, business, startup, entrepreneurship, customers, business growth
- finance = money, financial problems, losses, debt, investments, income, financial stability
- relationship = relationship, partner, marriage, spouse, love
- health = physical or mental health concerns
- life_decision = major personal decisions or uncertainty between choices
- other = none of the above clearly applies

IMPORTANT:

If multiple intents are present, include ALL of them.

Examples:

"I am getting losses in my company."
→ ["business", "finance"]

"I am getting financial losses in my job."
→ ["career", "finance"]

"I am thinking about starting a business."
→ ["business", "life_decision"]

"I am having problems in my marriage."
→ ["relationship"]

"I am confused about whether I should leave my job."
→ ["career", "life_decision"]

"I want to invest my savings."
→ ["finance"]

Return ONLY valid JSON.

Use exactly this structure:

{
  "intents": ["business", "finance"],
  "needs_astrologer_search": true
}

Rules for needs_astrologer_search:

- true if at least one relevant intent is detected
- false only when the message does not clearly relate to any listed intent

Do not explain your answer.
Do not use markdown.
Do not add text before or after the JSON.

User message:

${userMessage}
`);

        console.log("\nLLM analysis:");
        console.log(analysis);


        // Save intent in conversation state
        conversationState.intents = analysis.intents;
        conversationState.problem = userMessage;


        // --------------------------------------------------
        // CALL MCP
        // --------------------------------------------------

        if (analysis.needs_astrologer_search) {

            console.log("\nAgent decided to call search_astrologers...");

            const toolResult = await client.callTool({
                name: "search_astrologers",
                arguments: {
                    intents: analysis.intents
                }
            });


            console.log("\nMCP result:");
            console.log(toolResult);


            // Convert MCP text into JavaScript data
            const astrologers = JSON.parse(
                toolResult.content[0].text
            );


            // Select the highest-ranked astrologer
            const selectedAstrologer = astrologers[0];


            // Save astrologer information in state
            conversationState.selectedAstrologer =
                selectedAstrologer.name;

            conversationState.selectedAstrologerId =
                selectedAstrologer.id;


            // Move conversation to booking confirmation
            conversationState.stage =
                "booking_confirmation";

            
            // --------------------------------------------------
            // FINAL LLM RESPONSE
            // --------------------------------------------------

            const finalResponse = await askLLM(`
You are the AI consultation assistant for Celestial Insight.

The user said:

"${userMessage}"

Their consultation intent is:

${analysis.intents.join(", ")}

The most suitable astrologer found by the system is:

Name: ${selectedAstrologer.name}
Specialization: ${selectedAstrologer.specialization}
Experience: ${selectedAstrologer.experience_years} years
Rating: ${selectedAstrologer.rating}
Match score: ${selectedAstrologer.match_score}

Recommend this astrologer naturally.

Then ask the user whether they would like to book
a consultation with this astrologer.

Return ONLY valid JSON:

{
  "response": "natural language recommendation and booking question"
}
`);


            console.log("\nFinal AI response:");
            console.log(finalResponse);


            // console.log("\nConversation state:");
            // console.log(conversationState);


        } else {

            console.log("\nAI:");
            console.log(
                "Please tell me more about what you would like guidance on."
            );
        }


    // --------------------------------------------------
    // STAGE 2: BOOKING CONFIRMATION
    // --------------------------------------------------

    } else if (
        conversationState.stage === "booking_confirmation"
    ) {

        console.log(
            "\nCurrent selected astrologer:",
            conversationState.selectedAstrologer
        );


        const confirmation = await askLLM(`
    You are handling a consultation booking conversation.

    The user previously received a recommendation for:

    ${conversationState.selectedAstrologer}

    The user has now replied:

    "${userMessage}"

    Determine whether the user is accepting or rejecting
    the booking recommendation.

    Return ONLY valid JSON:

    {
    "confirmed": true
    }

    Use:

    true = user wants to book
    false = user does not want to book
    `);


        console.log("\nBooking confirmation analysis:");
        console.log(confirmation);


        if (confirmation.confirmed === true) {

            conversationState.stage =
                "collecting_datetime";


            console.log("\nAI:");
            console.log(
                `Great. You selected ${conversationState.selectedAstrologer}.`
            );
            console.log(
                "What date and time would you prefer for the consultation?"
            );

        } else {

            conversationState.stage = "completed";

            console.log("\nAI:");
            console.log(
                "No problem. If you need guidance later, feel free to ask."
            );
        }
    }

    // --------------------------------------------------
    // STAGE 3: COLLECTING DATE & TIME
    // --------------------------------------------------

    else if (
        conversationState.stage === "collecting_datetime"
    ) {

        const datetime = await askLLM(`
    You are handling a consultation booking.

    The user wants to book a consultation with:

    ${conversationState.selectedAstrologer}

    The user said:

    "${userMessage}"

    Extract the requested consultation date and time.

    Return ONLY valid JSON:

    {
    "date": "YYYY-MM-DD",
    "time": "HH:MM"
    }

    Rules:

    - Convert relative dates such as "tomorrow" into the actual date.
    - Use 24-hour time.
    - If the user did not provide enough information to determine
    the date or time, return null for that field.

    Today's date is:

    ${new Date().toISOString().split("T")[0]}
    `);

        console.log("\nDate/time analysis:");
        console.log(datetime);


        // -----------------------------------------
        // CHECK DATE/TIME
        // -----------------------------------------

        if (!datetime.date || !datetime.time) {

            console.log("\nAI:");
            console.log(
                "I couldn't determine the exact date and time. Please provide both."
            );

        } else {

            const scheduledAt =
                `${datetime.date}T${datetime.time}:00`;

            conversationState.scheduledAt = scheduledAt;


            // -----------------------------------------
            // CALL MCP CREATE CONSULTATION
            // -----------------------------------------

            console.log("\nAgent decided to call create_consultation...");

            const bookingResult = await client.callTool({
                name: "create_consultation",
                arguments: {
                    user_id: TEST_USER_ID,
                    astrologer_id:
                        conversationState.selectedAstrologerId,
                    problem:
                        conversationState.problem,
                    scheduled_at:
                        scheduledAt
                }
            });


            console.log("\nMCP booking result:");
            console.log(bookingResult);


            // -----------------------------------------
            // HANDLE BOOKING ERROR
            // -----------------------------------------

            if (bookingResult.isError) {

                console.log("\nAI:");
                console.log(
                    "I couldn't create the consultation. Please try again."
                );

            } else {

                const booking = JSON.parse(
                    bookingResult.content[0].text
                );


                // -----------------------------------------
                // BOOKING SUCCESS
                // -----------------------------------------

                conversationState.stage = "completed";

                console.log("\nAI:");
                console.log(
                    `Consultation booked successfully with ${conversationState.selectedAstrologer}.`
                );

                console.log(
                    `Scheduled for: ${scheduledAt}`
                );

                console.log(
                    `Booking ID: ${booking.id}`
                );
            }
        }
    }
    await client.close();
}


// --------------------------------------------------
// TERMINAL INPUT
// --------------------------------------------------

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


function startConversation() {

    rl.question("\nYou: ", async (userMessage) => {

        if (
            userMessage.toLowerCase() === "exit" ||
            userMessage.toLowerCase() === "quit"
        ) {
            console.log("\nConversation ended.");
            rl.close();
            return;
        }


        try {

            await runAgent(userMessage);

        } catch (error) {

            console.error("\nAgent failed:", error);
        }


        startConversation();
    });
}


// --------------------------------------------------
// START APPLICATION
// --------------------------------------------------

console.log("=================================");
console.log(" Celestial Insight AI Assistant");
console.log(" Type 'exit' to quit.");
console.log("=================================");

startConversation();