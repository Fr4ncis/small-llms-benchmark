#!/usr/bin/env node

require('dotenv').config(); // Add dotenv to load environment variables
const fs = require('fs');
const path = require('path');
const kleur = require('kleur');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

// Default model constant
const BEDROCK_LLAMA_DEFAULT_MODEL = 'meta.llama3-1-70b-instruct-v1:0';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
    .option('model', {
        alias: 'm',
        description: 'Specify the model to use',
        type: 'string',
        default: BEDROCK_LLAMA_DEFAULT_MODEL
    })
    .help()
    .alias('help', 'h')
    .argv;

// Configuration
const OUTPUT_DIR = 'output';
const MODEL = argv.model;

// Validate AWS credentials
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error(kleur.red('Error: AWS credentials are required. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env'));
    process.exit(1);
}

// AWS Bedrock client configuration
const bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)){
    fs.mkdirSync(OUTPUT_DIR);
}

// Function to make Bedrock API call
async function getCompletion(prompt) {
    const startTime = Date.now();
    
    try {
        const input = {
            modelId: MODEL,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
                max_gen_len: 512,
                temperature: 0.0,
                top_p: 0.9
            })
        };

        const command = new InvokeModelCommand(input);
        const response = await bedrockClient.send(command);

        // Parse the response
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const endTime = Date.now();
        const duration = endTime - startTime;

        return {
            response: responseBody.generation,
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
    outputContent += `Total time: ${totalDuration}ms\n`;

    // Create output filename based on model
    const sanitizedModelName = MODEL.replace(/[^a-zA-Z0-9-_]/g, '-');
    const outputPath = path.join(OUTPUT_DIR, `bedrock-${sanitizedModelName}.txt`);

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
