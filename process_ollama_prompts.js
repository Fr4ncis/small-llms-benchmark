#!/usr/bin/env node

const { fetch } = require('undici');
const kleur = require('kleur');
const { parseArguments, processPrompts } = require('./llm_utils');

// Parse command line arguments
const argv = parseArguments({
    defaultModel: 'gemma2:2b',
    modelDescription: 'Specify the model to use',
    additionalOptions: {
        'server': {
            alias: 's',
            description: 'Specify the LLM server URL',
            type: 'string',
            default: 'http://localhost:11434'
        }
    }
});

// Configuration
const LLM_SERVER_URL = argv.server;
const MODEL = argv.model;

// Check if the server is running before starting
async function checkServer() {
    try {
        await fetch(`${LLM_SERVER_URL}/api/tags`);
        return true;
    } catch (error) {
        console.log(error);
        console.error(kleur.red(`Error: Ollama server is not running on ${LLM_SERVER_URL}`));
        console.error(kleur.red('Please start the Ollama server first.'));
        process.exit(1);
    }
}

// Function to make API call
async function getCompletion(prompt) {
    const startTime = Date.now();
    
    try {
        const response = await fetch(`${LLM_SERVER_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                prompt: prompt,
                stream: false
            })
        });

        const data = await response.json();
        const endTime = Date.now();
        const duration = endTime - startTime;

        return {
            response: data.response,
            duration: duration,
            model: MODEL
        };
    } catch (error) {
        console.error(kleur.red(`Error processing prompt: ${error}`));
        return {
            response: "Error",
            duration: 0,
            model: MODEL
        };
    }
}

// Run the script
(async () => {
    // Check server before processing
    await checkServer();

    // Process prompts using the common utility
    await processPrompts(getCompletion, {
        model: MODEL,
        provider: 'ollama'
    }).catch(error => {
        console.error(kleur.red('Error:', error));
        process.exit(1);
    });
})();
