require("dotenv").config();

const readline = require("readline");
const { askLLM } = require("../services/ai");
const { retrieveKnowledge } = require("../services/retrieval");
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
    stage: "initial",
    activeConsultations: []
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
// CONVERSATIONAL MESSAGE HANDLER
// --------------------------------------------------

async function handleConversationalMessage(userMessage) {

    const analysis = await askLLM(`
You are the conversation classifier for Celestial Insight.

Classify the user's message into exactly ONE category:

greeting
thanks
goodbye
casual
consultation

Definitions:

- greeting = hello, hi, hey, good morning, good evening, etc.
- thanks = thank you, thanks, appreciate it, etc.
- goodbye = bye, goodbye, see you, good night, etc.
- casual = general conversation that is not a consultation request
- consultation = the user is asking for astrology guidance or describing a personal problem they want help with

Return ONLY valid JSON:

{
  "type": "greeting"
}

User message:
"${userMessage}"
`);

    console.log("\nConversation classification:");
    console.log(analysis);

    if (analysis.type === "greeting") {
        return {
        handled: true,
        response: "Hello! How can I help you today?"
    };
    }

    if (analysis.type === "thanks") {
        return {
        handled: true,
        response:
            "You're very welcome! I'm here if you need any further help."
    };
    }

    if (analysis.type === "goodbye") {
        return {
            handled: true,
            response:
                "Goodbye! Take care, and feel free to come back whenever you need guidance."
        };
    }

    if (analysis.type === "casual") {

        const response = await askLLM(`
You are the conversational assistant for Celestial Insight.

Respond naturally and briefly to the user's message.

Do not start an astrology consultation unless the user actually asks for one.

Keep the conversation friendly and open.

Return ONLY valid JSON:

{
  "response": "your response"
}

User:
"${userMessage}"
`);

        return {
    handled: true,
    response: response.response
};
    }

    // consultation → let the normal agent flow handle it
    return {
    handled: false
};
}

// --------------------------------------------------
// MAIN AGENT
// --------------------------------------------------

async function runAgent(userMessage) {

    const client = await createMCPClient();
    try{
        console.log("\nAgent started.");
        console.log("User:", userMessage);
            // --------------------------------------------------
        // HANDLE GENERAL CONVERSATION
        // --------------------------------------------------

        if (
            conversationState.stage === "initial" ||
            conversationState.stage === "completed"
        ) {

            const conversationResult =
                await handleConversationalMessage(userMessage);

            if (conversationResult.handled) {
                return {
                    response: conversationResult.response
                };
            }

            // If the previous conversation was completed
            // and the user starts a new consultation,
            // reset the relevant state.
            if (conversationState.stage === "completed") {
                conversationState.intents = [];
                conversationState.selectedAstrologer = null;
                conversationState.selectedAstrologerId = null;
                conversationState.scheduledAt = null;
                conversationState.problem = null;
                conversationState.activeConsultations = [];
                conversationState.stage = "initial";
            }
        }

    // --------------------------------------------------
// Handle cancellation request
// --------------------------------------------------

const normalizedMessage = userMessage
    .toLowerCase()
    .trim();

const isCancellationRequest =
    normalizedMessage === "cancel" ||
    normalizedMessage === "cancel consultation" ||
    normalizedMessage === "cancel booking" ||
    normalizedMessage === "cancel my booking" ||
    normalizedMessage === "cancel my consultation" ||
    normalizedMessage.includes("want to cancel") ||
    normalizedMessage.includes("would like to cancel") ||
    normalizedMessage.includes("need to cancel") ||
    normalizedMessage.includes("cancel a booking") ||
    normalizedMessage.includes("cancel the booking") ||
    normalizedMessage.includes("cancel another") ||
    normalizedMessage.includes("cancel my other booking") ||
    normalizedMessage.includes("cancel my other consultation");


// --------------------------------------------------
// New cancellation request
// --------------------------------------------------

if (
    conversationState.stage === "initial" &&
    isCancellationRequest
) {
    console.log(
        "\nAgent decided to find active consultations..."
    );

    const result = await client.callTool({
        name: "get_active_consultations",
        arguments: {
            user_id: TEST_USER_ID
        }
    });

    if (result.isError) {

        const response =
            "I couldn't retrieve your active consultations.";

        console.log("\nAI:");
        console.log(response);

        return {
            response
        };
    }

    const consultations = JSON.parse(
        result.content[0].text
    );

    if (consultations.length === 0) {

        const response =
            "You don't have any active consultations to cancel.";

        console.log("\nAI:");
        console.log(response);

        return {
            response
        };
    }

    conversationState.activeConsultations =
        consultations;

    conversationState.stage = "cancelling";

    console.log("\nAI:");
    console.log(
        "Which consultation would you like to cancel?\n"
    );

    consultations.forEach(
        (consultation, index) => {

            const astrologer =
                consultation.astrologers?.name ||
                "Unknown astrologer";

            const specialization =
                consultation.astrologers?.specialization ||
                "";

            console.log(
                `${index + 1}. ${astrologer} — ${specialization}`
            );

            console.log(
                `   Date: ${consultation.scheduled_at}`
            );

            console.log(
                `   Booking ID: ${consultation.id}\n`
            );
        }
    );

    const consultationList =
        consultations
            .map((consultation, index) => {

                const astrologer =
                    consultation.astrologers?.name ||
                    "Unknown astrologer";

                const specialization =
                    consultation.astrologers?.specialization ||
                    "";

                return (
                    `${index + 1}. ${astrologer} — ${specialization}\n` +
                    `   Date: ${consultation.scheduled_at}`
                );
            })
            .join("\n\n");

    const response =
        `Which consultation would you like to cancel?\n\n` +
        `${consultationList}\n\n` +
        `Please enter the number of the consultation.`;

    console.log(response);

    return {
        response
    };
}


// --------------------------------------------------
// Handle consultation selection for cancellation
// --------------------------------------------------

if (conversationState.stage === "cancelling") {

    const selectedNumber =
        parseInt(userMessage.trim());

    if (
        isNaN(selectedNumber) ||
        selectedNumber < 1 ||
        selectedNumber >
            conversationState.activeConsultations.length
    ) {

        const response =
            `Please enter a number between 1 and ` +
            `${conversationState.activeConsultations.length}.`;

        console.log("\nAI:");
        console.log(response);

        return {
            response
        };
    }

    const selectedConsultation =
        conversationState.activeConsultations[
            selectedNumber - 1
        ];

    console.log(
        "\nAgent decided to call cancel_consultation..."
    );

    const cancelResult = await client.callTool({
        name: "cancel_consultation",
        arguments: {
            consultation_id:
                selectedConsultation.id
        }
    });

    console.log(
        "\nMCP cancellation result:"
    );
    console.log(cancelResult);

    if (cancelResult.isError) {

        const response =
            "I couldn't cancel that consultation. Please try again.";

        console.log("\nAI:");
        console.log(response);

        return {
            response
        };
    }

    conversationState.stage = "initial";

    conversationState.activeConsultations = [];

    const astrologer =
        selectedConsultation.astrologers?.name ||
        "the astrologer";

    const response =
        `Your consultation with ${astrologer} ` +
        `has been cancelled successfully.`;

    console.log("\nAI:");
    console.log(response);

    return {
        response
    };
}

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

            const knowledgeChunks = await retrieveKnowledge(userMessage, 3);

            console.log("\nRAG retrieved knowledge:");

            knowledgeChunks.forEach((chunk, index) => {
                console.log(`\n--- RAG Result ${index + 1} ---`);
                console.log("Title:", chunk.title);
                console.log("Category:", chunk.category);
                console.log("Similarity:", chunk.similarity);
                console.log("Content:", chunk.content);
            });

            const knowledgeContext = knowledgeChunks
                .map((chunk, index) => {
                    return `Source ${index + 1}: ${chunk.title}\n${chunk.content}`;
                })
                .join("\n\n");


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
    KNOWLEDGE CONTEXT:
    ${knowledgeContext}


    Use the knowledge context when relevant to the user's problem.
    Do not invent astrology facts that are not supported by the knowledge context.

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
                return {
                response: finalResponse.response
            };


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


                return {
            response:
                `Great. You selected ${conversationState.selectedAstrologer}. ` +
                `What date and time would you prefer for the consultation?`
        };

            } else {

                return {
                response:
                    "No problem. If you need guidance later, feel free to ask."
            };
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

                    return {
                    response:
                        `Consultation booked successfully with ${conversationState.selectedAstrologer}. Scheduled for ${scheduledAt}. Booking ID: ${booking.id}`
                };

                    
                }
            }
        }
    }finally {
        await client.close();
    }
}


// --------------------------------------------------
// TERMINAL APPLICATION
// --------------------------------------------------

if (require.main === module) {

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

                const result = await runAgent(userMessage);

                if (result && result.response) {
                    console.log("\nAI:");
                    console.log(result.response);
                }

            } catch (error) {

                console.error("\nAgent failed:", error);
            }

            startConversation();
        });
    }

    console.log("=================================");
    console.log(" Celestial Insight AI Assistant");
    console.log(" Type 'exit' to quit.");
    console.log("=================================");

    startConversation();
}


// --------------------------------------------------
// EXPORT
// --------------------------------------------------

module.exports = {
    runAgent
};