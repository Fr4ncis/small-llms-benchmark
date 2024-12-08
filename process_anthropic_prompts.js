#!/usr/bin/env node

require('dotenv').config();
const { fetch } = require('undici');
const kleur = require('kleur');
const { parseArguments, processPrompts } = require('./llm_utils');

// Default model constant
const ANTHROPIC_DEFAULT_MODEL = 'claude-3-5-haiku-20241022';

// Parse command line arguments
const argv = parseArguments({
    defaultModel: ANTHROPIC_DEFAULT_MODEL,
    modelDescription: 'Specify the model ID (e.g., claude-3-5-haiku-20241022)',
    modelEnvVar: 'ANTHROPIC_DEFAULT_MODEL'
});

// Configuration
const MODEL = argv.model;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const API_URL = 'https://api.anthropic.com/v1/messages';

// Function to make Anthropic API call
async function getCompletion(prompt) {
    const startTime = Date.now();
    
    try {
        // Validate API Key
        if (!ANTHROPIC_API_KEY) {
            throw new Error('Anthropic API key is required. Set ANTHROPIC_API_KEY in .env');
        }

        const requestBody = {
            model: MODEL,
            max_tokens: 1000,
            temperature: 0,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt
                        }
                    ]
                }
            ]
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
        }

        const data = await response.json();
        const endTime = Date.now();
        const duration = endTime - startTime;

        return {
            response: data.content[0].text,
            duration: duration,
            model: MODEL
        };
    } catch (error) {
        console.error(kleur.red('Error calling Anthropic API:', error.message));
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
    provider: 'anthropic'
}).catch(error => {
    console.error(kleur.red('Error:', error));
    process.exit(1);
});
