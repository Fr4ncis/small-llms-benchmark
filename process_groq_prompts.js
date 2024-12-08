#!/usr/bin/env node

const { fetch } = require('undici');
const kleur = require('kleur');
const { parseArguments, processPrompts } = require('./llm_utils');

// Default model constant
const GROQ_DEFAULT_MODEL = 'llama3-8b-8192';

// Parse command line arguments
const argv = parseArguments({
    defaultModel: GROQ_DEFAULT_MODEL,
    modelDescription: 'Specify the Groq model to use',
    additionalOptions: {
        'api-key': {
            alias: 'k',
            description: 'Specify the Groq API key',
            type: 'string',
            default: process.env.GROQ_API_KEY
        }
    }
});

const GROQ_API_KEY = argv.apiKey;
const MODEL = argv.model;

async function getCompletion(prompt) {
    const startTime = Date.now();
    
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
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
        console.error(kleur.red('Error calling Groq API:', error.message));
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
    provider: 'groq'
}).catch(error => {
    console.error(kleur.red('Error:', error));
    process.exit(1);
});
