#!/usr/bin/env node

require('dotenv').config();
const OpenAI = require('openai');
const kleur = require('kleur');
const { parseArguments, processPrompts } = require('./llm_utils');

// Default model constant
const OPENAI_DEFAULT_MODEL = 'gpt-4';

// Parse command line arguments
const argv = parseArguments({
    defaultModel: OPENAI_DEFAULT_MODEL,
    modelDescription: 'Specify the model ID (e.g., gpt-4, gpt-3.5-turbo)',
    modelEnvVar: 'OPENAI_DEFAULT_MODEL'
});

// Configuration
const MODEL = argv.model;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

// Function to make OpenAI API call
async function getCompletion(prompt) {
    const startTime = Date.now();
    
    try {
        // Validate API Key
        if (!OPENAI_API_KEY) {
            throw new Error('OpenAI API key is required. Set OPENAI_API_KEY in .env');
        }

        const completion = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                { 
                    role: "user", 
                    content: prompt 
                }
            ],
            temperature: 0,
            max_tokens: 1000
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        return {
            response: completion.choices[0].message.content,
            duration: duration,
            model: MODEL
        };
    } catch (error) {
        console.error(kleur.red('Error calling OpenAI API:', error.message));
        return {
            response: "Error",
            duration: 0,
            model: MODEL
        };
    }
}

// Run the script
processPrompts(getCompletion, {
    model: MODEL,
    provider: 'openai'
}).catch(error => {
    console.error(kleur.red('Error:', error));
    process.exit(1);
});
