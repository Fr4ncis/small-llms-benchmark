#!/usr/bin/env node

const { fetch } = require('undici');
const kleur = require('kleur');
const { parseArguments, processPrompts } = require('./llm_utils');

// Default constants
const LMSTUDIO_BASE_URL = 'http://localhost:1234/v1';
const LMSTUDIO_DEFAULT_MODEL = 'local-model';

// Parse command line arguments
const argv = parseArguments({
    defaultModel: LMSTUDIO_DEFAULT_MODEL,
    modelDescription: 'Specify the model to use',
    modelEnvVar: 'LMSTUDIO_DEFAULT_MODEL'
});

const LLM_SERVER_URL = LMSTUDIO_BASE_URL;
const MODEL = argv.model;

// Check if the server is running before starting
async function checkServer() {
    try {
        await fetch(`${LLM_SERVER_URL}/models`);
        return true;
    } catch (error) {
        console.error(kleur.red(`Error: LLM server is not running on ${LLM_SERVER_URL}`));
        console.error(kleur.red('Please start the server first.'));
        process.exit(1);
    }
}

// Function to make API call
async function getCompletion(prompt) {
    const startTime = Date.now();
    
    try {
        const response = await fetch(`${LLM_SERVER_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.0,
                max_tokens: -1,
                stream: false
            })
        });

        const data = await response.json();
        const endTime = Date.now();
        const duration = endTime - startTime;

        return {
            response: data.choices[0].message.content,
            duration: duration,
            model: data.model || MODEL
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
        provider: 'lmstudio'
    }).catch(error => {
        console.error(kleur.red('Error:', error));
        process.exit(1);
    });
})();
