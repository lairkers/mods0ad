import { PetraBot } from "simulation/ai/petra/_petrabot.js";

// Alpha 28 uses ES modules for AI scripts. Exporting the built-in Petra bot
// here keeps this AI entrypoint compatible with existing PETRA_Expert metadata.
export const PetraExpertBot = PetraBot;
