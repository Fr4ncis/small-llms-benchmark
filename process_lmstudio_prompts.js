#!/usr/bin/env node

const { fetch } = require('undici');
const fs = require('fs');
const path = require('path');
const kleur = require('kleur');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Default constants
const LMSTUDIO_BASE_URL = 'http://localhost:1234/v1';
const LMSTUDIO_DEFAULT_MODEL = 'local-model';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
    .option('model', {
        alias: 'm',
        description: 'Specify the model to use',
        type: 'string',
        default: LMSTUDIO_DEFAULT_MODEL
    })
    .help()
    .alias('help', 'h')
    .argv;

// Configuration
const LLM_SERVER_URL = LMSTUDIO_BASE_URL;
const OUTPUT_DIR = 'output';
const MODEL = argv.model;

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)){
    fs.mkdirSync(OUTPUT_DIR);
}

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
    let modelUsed = '';

    // Process each prompt
    for (let i = 0; i < inputData.prompts.length; i++) {
        const prompt = inputData.prompts[i];
        console.log(`\n${kleur.cyan(`Prompt ${i + 1}: ${prompt}`)}`);

        const result = await getCompletion(prompt);
        console.log(kleur.green(`Response: ${result.response}`));
        console.log(kleur.yellow(`Time taken: ${result.duration}ms`));
        
        // Store the model name from the first successful response
        if (!modelUsed && result.model !== "unknown") {
            modelUsed = result.model;
        }

        // Append to output content
        outputContent += `Prompt ${i + 1}: ${prompt}\n`;
        outputContent += `Response: ${result.response}\n`;
        outputContent += `Time: ${result.duration}ms\n\n`;
        
        totalDuration += result.duration;
    }

    // Add summary section at the end
    outputContent += '=== Summary ===\n';
    outputContent += `Model used: ${modelUsed}\n`;
    outputContent += `Total time: ${totalDuration}ms\n`;

    // Create output filename based on model
    const sanitizedModelName = modelUsed.replace(/[^a-zA-Z0-9-_]/g, '-');
    const outputPath = path.join(OUTPUT_DIR, `lmstudio-${sanitizedModelName}.txt`);

    // Write to output file
    fs.writeFileSync(outputPath, outputContent);

    // Print model information and total time
    console.log('\n' + kleur.magenta(`Model used: ${modelUsed}`));
    console.log(kleur.yellow(`Total time for all responses: ${totalDuration}ms`));
}

// Run the script
processPrompts().catch(error => {
    console.error(kleur.red('Error:', error));
    process.exit(1);
});
