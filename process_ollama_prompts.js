#!/usr/bin/env node

const { fetch } = require('undici');
const fs = require('fs');
const path = require('path');
const kleur = require('kleur');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
    .option('model', {
        alias: 'm',
        description: 'Specify the model to use',
        type: 'string',
        default: 'gemma2:2b'
    })
    .option('server', {
        alias: 's',
        description: 'Specify the LLM server URL',
        type: 'string',
        default: 'http://localhost:11434'
    })
    .help()
    .alias('help', 'h')
    .argv;

// Configuration
const LLM_SERVER_URL = argv.server;
const OUTPUT_DIR = 'output';
const MODEL = argv.model;

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)){
    fs.mkdirSync(OUTPUT_DIR);
}

// Check if the server is running before starting
async function checkServer() {
    try {
        await fetch(`${LLM_SERVER_URL}/api/tags`);
        return true;
    } catch (error) {
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

// Main function
async function processPrompts() {
    await checkServer();
    
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
    outputContent += `Model used: ${MODEL}\n`;
    outputContent += `Server URL: ${LLM_SERVER_URL}\n`;
    outputContent += `Total time: ${totalDuration}ms\n`;

    // Create output filename based on model
    const sanitizedModelName = MODEL.replace(/[^a-zA-Z0-9-_]/g, '-');
    const outputPath = path.join(OUTPUT_DIR, `ollama-${sanitizedModelName}.txt`);

    // Write to output file
    fs.writeFileSync(outputPath, outputContent);

    // Print model information and total time
    console.log('\n' + kleur.magenta(`Model used: ${MODEL}`));
    console.log(kleur.magenta(`Server URL: ${LLM_SERVER_URL}`));
    console.log(kleur.yellow(`Total time for all responses: ${totalDuration}ms`));
}

// Run the script
processPrompts().catch(error => {
    console.error(kleur.red('Error:', error));
    process.exit(1);
});
