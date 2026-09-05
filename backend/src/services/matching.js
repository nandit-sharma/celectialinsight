function calculateMatchScore(astrologer, intent) {
    const specialization = astrologer.specialization.toLowerCase();
    const requestedIntent = intent.toLowerCase();

    let score = 50;

    // Specialization match
    if (specialization.includes(requestedIntent)) {
        score += 35;
    }

    // Related specializations
    if (
        requestedIntent === "business" &&
        (specialization.includes("career") ||
         specialization.includes("finance"))
    ) {
        score += 20;
    }

    if (
        requestedIntent === "career" &&
        specialization.includes("business")
    ) {
        score += 15;
    }

    // Rating bonus
    score += (astrologer.rating || 0) * 2;

    return Math.min(Math.round(score), 100);
}

function rankAstrologers(astrologers, intent) {
    return astrologers
        .filter(astrologer => astrologer.available)
        .map(astrologer => ({
            ...astrologer,
            match_score: calculateMatchScore(astrologer, intent)
        }))
        .sort((a, b) => b.match_score - a.match_score);
}

module.exports = {
    rankAstrologers
};