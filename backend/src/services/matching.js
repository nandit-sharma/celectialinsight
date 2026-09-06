function calculateMatchScore(astrologer, intents) {

    const specialization =
        astrologer.specialization.toLowerCase();

    if (!Array.isArray(intents)) {
        intents = [intents];
    }

    let score = 0;

    for (const intent of intents) {

        const requestedIntent = intent.toLowerCase();

        // -----------------------------------------
        // EXACT SPECIALIZATION MATCH
        // -----------------------------------------

        if (specialization.includes(requestedIntent)) {
            score += 50;
            continue;
        }


        // -----------------------------------------
        // RELATED SPECIALIZATION MATCH
        // -----------------------------------------

        if (
            requestedIntent === "business" &&
            (
                specialization.includes("career") ||
                specialization.includes("finance")
            )
        ) {
            score += 20;
        }

        else if (
            requestedIntent === "finance" &&
            (
                specialization.includes("business") ||
                specialization.includes("career")
            )
        ) {
            score += 20;
        }

        else if (
            requestedIntent === "career" &&
            specialization.includes("business")
        ) {
            score += 20;
        }

        else if (
            requestedIntent === "relationship" &&
            specialization.includes("marriage")
        ) {
            score += 40;
        }

        else if (
            requestedIntent === "health" &&
            specialization.includes("health")
        ) {
            score += 50;
        }

        else if (
            requestedIntent === "life_decision" &&
            specialization.includes("life")
        ) {
            score += 30;
        }
    }


    // -----------------------------------------
    // MULTI-INTENT BONUS
    // -----------------------------------------

    if (intents.length > 1) {

        let matchedIntents = 0;

        for (const intent of intents) {

            if (specialization.includes(intent.toLowerCase())) {
                matchedIntents++;
            }
        }

        // Reward astrologers who directly match
        // multiple aspects of the user's problem
        score += matchedIntents * 15;
    }


    // -----------------------------------------
    // RATING BONUS
    // -----------------------------------------

    score += (astrologer.rating || 0) * 2;


    return Math.round(score);
}


function rankAstrologers(astrologers, intents) {

    return astrologers

        .filter(astrologer => astrologer.available)

        .map(astrologer => ({
            ...astrologer,

            match_score:
                calculateMatchScore(astrologer, intents)
        }))

        .sort(
            (a, b) =>
                b.match_score - a.match_score
        );
}


module.exports = {
    calculateMatchScore,
    rankAstrologers
};