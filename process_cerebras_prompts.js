#!/usr/bin/env node

require('dotenv').config();
const { fetch } = require('undici');
const kleur = require('kleur');
const { parseArguments, processPrompts } = require('./llm_utils');

// Default model constant
const CEREBRAS_DEFAULT_MODEL = 'llama3.1-8b';

// Parse command line arguments
const argv = parseArguments({
    defaultModel: CEREBRAS_DEFAULT_MODEL,
    modelDescription: 'Specify the Cerebras model to use'
});

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const MODEL = argv.model;

async function getCompletion(prompt) {
    const startTime = Date.now();
    
    try {
        const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CEREBRAS_API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                stream: false,
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: 0,
                max_tokens: -1,
                seed: 0,
                top_p: 1
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
        }

        const data = await response.json();
        const modelResponse = data.choices[0].message.content;
        const endTime = Date.now();
        const duration = endTime - startTime;

        return {
            response: modelResponse,
            duration: duration,
            model: MODEL
        };
    } catch (error) {
        console.error(kleur.red('Error calling Cerebras API:', error.message));
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
    provider: 'cerebras'
}).catch(error => {
    console.error(kleur.red('Error:', error));
    process.exit(1);
});
