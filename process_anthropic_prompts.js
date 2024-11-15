#!/usr/bin/env node

require('dotenv').config(); // Add dotenv to load environment variables
const fs = require('fs');
const path = require('path');
const kleur = require('kleur');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Default model constant
const ANTHROPIC_DEFAULT_MODEL = 'claude-3-haiku-20240307';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
    .option('model', {
        alias: 'm',
        description: 'Specify the model to use (Haiku, Sonnet, Opus, Sonnet35, Haiku35)',
        type: 'string',
        default: process.env.ANTHROPIC_DEFAULT_MODEL || ANTHROPIC_DEFAULT_MODEL
    })
    .help()
    .alias('help', 'h')
    .argv;

// Configuration
const OUTPUT_DIR = 'output';
const MODEL = argv.model;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const API_URL = 'https://api.anthropic.com/v1/messages';

const modelsDict = [
    { id: "claude-3-haiku-20240307", name: "Haiku" },
    { id: "claude-3-sonnet-20240229", name: "Sonnet" },
    { id: "claude-3-opus-20240229", name: "Opus" },
    { id: "claude-3-5-sonnet-20240620", name: "Sonnet35" },
    { id: "claude-3-5-haiku-20241022", name: "Haiku35" }
];

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)){
    fs.mkdirSync(OUTPUT_DIR);
}

function getModelId(modelName) {
    const model = modelsDict.find(model => model.name === modelName);
    return model ? model.id : null;
}

// Function to make Anthropic API call
async function getCompletion(prompt) {
    const startTime = Date.now();
    
    try {
        const modelId = getModelId(MODEL);
        if (!modelId) {
            throw new Error(`Invalid model name: ${MODEL}`);
        }

        // Validate API Key
        if (!ANTHROPIC_API_KEY) {
            throw new Error('Anthropic API key is required. Set ANTHROPIC_API_KEY in .env');
        }

        const requestBody = {
            model: modelId,
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
            model: modelId
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

// Main function
async function processPrompts() {
    // Read and parse the input JSON file
    let inputData;
    try {
        const promptsPath = path.join(process.cwd(), 'prompts.json');
        if (!fs.existsSync(promptsPath)) {
            console.error(kleur.red('Error: prompts.json file not found'));
            process.exit(1);
        }
        
        const fileContent = fs.readFileSync(promptsPath, 'utf8');
        inputData = JSON.parse(fileContent);

        if (!inputData.prompts || !Array.isArray(inputData.prompts)) {
            throw new Error('Invalid prompts.json format. Expected {"prompts": [...]}');
        }
    } catch (error) {
        console.error(kleur.red('Error reading prompts.json:', error.message));
        process.exit(1);
    }

    let totalDuration = 0;
    let outputContent = '';
    let modelId = getModelId(MODEL);

    // Process each prompt
    for (let i = 0; i < inputData.prompts.length; i++) {
        const prompt = inputData.prompts[i];
        console.log(`\n${kleur.cyan(`Prompt ${i + 1}: ${prompt}`)}`);

        const result = await getCompletion(prompt);
        console.log(kleur.green(`Response: ${result.response}`));
        console.log(kleur.yellow(`Time taken: ${result.duration}ms`));

        // Append to output content
        outputContent += `Prompt ${i + 1}: ${prompt}\n`;
        outputContent += `Response: ${result.response}\n`;
        outputContent += `Time: ${result.duration}ms\n\n`;
        
        totalDuration += result.duration;
    }

    // Add summary section at the end
    outputContent += '=== Summary ===\n';
    outputContent += `Model used: ${modelId}\n`;
    outputContent += `Total time: ${totalDuration}ms\n`;

    // Create output filename based on model
    const outputPath = path.join(OUTPUT_DIR, `anthropic-${MODEL.toLowerCase()}.txt`);

    // Write to output file
    fs.writeFileSync(outputPath, outputContent);

    // Print model information and total time
    console.log('\n' + kleur.magenta(`Model used: ${MODEL}`));
    console.log(kleur.yellow(`Total time for all responses: ${totalDuration}ms`));
}

// Run the script
processPrompts().catch(error => {
    console.error(kleur.red('Error:', error));
    process.exit(1);
});
