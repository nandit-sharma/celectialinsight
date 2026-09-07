const { runAgent } = require("./mcp/client");
const express = require("express");
require("dotenv").config();
const cors = require("cors");
const { rankAstrologers } = require("./services/matching");
const supabase = require("./config/supabase");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "AstroAssist backend is running!"
    });
});

app.get("/api/astrologers", async (req, res) => {
    const { data, error } = await supabase
        .from("astrologers")
        .select("*");

    if (error) {
        return res.status(500).json({
            error: error.message
        });
    }

    res.json(data);
});
app.post("/api/users", async (req, res) => {
    const {
        name,
        email,
        phone,
        birth_date,
        birth_time,
        birth_place
    } = req.body;

    const { data, error } = await supabase
        .from("users")
        .insert([
            {
                name,
                email,
                phone,
                birth_date,
                birth_time,
                birth_place
            }
        ])
        .select()
        .single();

    if (error) {
        return res.status(500).json({
            error: error.message
        });
    }

    res.status(201).json(data);
});
app.get("/api/users", async (req, res) => {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        return res.status(500).json({
            error: error.message
        });
    }

    res.json(data);
});
app.post("/api/consultations", async (req, res) => {
    const {
        user_id,
        astrologer_id,
        problem,
        scheduled_at
    } = req.body;

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
        return res.status(500).json({
            error: error.message
        });
    }

    res.status(201).json(data);
});
app.get("/api/consultations", async (req, res) => {
    const { data, error } = await supabase
        .from("consultations")
        .select(`
            *,
            users(name, email),
            astrologers(name, specialization)
        `)
        .order("created_at", { ascending: false });

    if (error) {
        return res.status(500).json({
            error: error.message
        });
    }

    res.json(data);
});
app.get("/api/astrologers/match", async (req, res) => {
    const { intent } = req.query;

    if (!intent) {
        return res.status(400).json({
            error: "Intent is required"
        });
    }

    const { data, error } = await supabase
        .from("astrologers")
        .select("*");

    if (error) {
        return res.status(500).json({
            error: error.message
        });
    }

    const rankedAstrologers = rankAstrologers(data, intent);

    res.json({
        intent,
        recommendations: rankedAstrologers
    });
});
app.post("/api/chat", async (req, res) => {

    const { message } = req.body;

    if (!message) {
        return res.status(400).json({
            error: "Message is required"
        });
    }

    try {

        const result = await runAgent(message);

        res.json(result);

    } catch (error) {

        console.error("Chat error:", error);

        res.status(500).json({
            error: "Failed to process message"
        });
    }
});



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});