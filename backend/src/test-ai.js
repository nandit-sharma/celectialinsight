const { analyzeUserMessage } = require("./services/ai");

async function testAI() {
    const result = await analyzeUserMessage(
        "I am thinking about leaving my current job and starting my own business.",
        "My relationship with my partner is going through a difficult phase.",
        "I am confused about what career path I should choose.",
        "Should I invest my money or save it?",
        "Hello"
    );

    console.log("AI Result:");
    console.log(result);
}

testAI().catch((error) => {
    console.error("AI test failed:", error);
});