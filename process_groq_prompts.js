#!/usr/bin/env node

const { fetch } = require('undici');
const fs = require('fs');
const path = require('path');
const kleur = require('kleur');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Default model constant
const GROQ_DEFAULT_MODEL = 'llama3-8b-8192';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
    .option('model', {
        alias: 'm',
        description: 'Specify the Groq model to use',
        type: 'string',
        default: GROQ_DEFAULT_MODEL
    })
    .option('api-key', {
        alias: 'k',
        description: 'Specify the Groq API key',
        type: 'string',
        default: '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'
    })
    .help()
    .alias('help', 'h')
    .argv;

const GROQ_API_KEY = argv.apiKey;
const MODEL = argv.model;

async function processGroqPrompts() {
    try {
        // Read prompts from prompts.json
        const promptsPath = path.join(process.cwd(), 'prompts.json');
        if (!fs.existsSync(promptsPath)) {
            console.error(kleur.red('Error: prompts.json file not found'));
            process.exit(1);
        }
        
        const fileContent = fs.readFileSync(promptsPath, 'utf8');
        const inputData = JSON.parse(fileContent);

        if (!inputData.prompts || !Array.isArray(inputData.prompts)) {
            throw new Error('Invalid prompts.json format. Expected {"prompts": [...]}');
        }

        // Ensure output directory exists
        const outputDir = path.join(process.cwd(), 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        let totalDuration = 0;
        let outputContent = '';

        // Process each prompt
        for (let i = 0; i < inputData.prompts.length; i++) {
            const prompt = inputData.prompts[i];
            console.log(`\n${kleur.cyan(`Prompt ${i + 1}: ${prompt}`)}`);

            const startTime = Date.now();
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

            const data = await response.json();
            
            // Extract the model response
            const modelResponse = data.choices[0].message.content;
            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(kleur.green(`Response: ${modelResponse}`));
            console.log(kleur.yellow(`Time taken: ${duration}ms`));

            // Append to output content
            outputContent += `Prompt ${i + 1}: ${prompt}\n`;
            outputContent += `Response: ${modelResponse}\n`;
            outputContent += `Time: ${duration}ms\n\n`;
            
            totalDuration += duration;
        }

        // Add summary section at the end
        outputContent += '=== Summary ===\n';
        outputContent += `Model used: ${MODEL}\n`;
        outputContent += `Total time: ${totalDuration}ms\n`;

        // Generate output filename
        const outputPath = path.join(outputDir, `groq-${MODEL.replace(/[^a-zA-Z0-9-_]/g, '-')}.txt`);

        // Write to output file
        fs.writeFileSync(outputPath, outputContent);

        // Print model information and total time
        console.log('\n' + kleur.magenta(`Model used: ${MODEL}`));
        console.log(kleur.yellow(`Total time for all responses: ${totalDuration}ms`));

    } catch (error) {
        console.error(kleur.red('Error processing Groq prompts:'), error);
        process.exit(1);
    }
}

// Run the function
processGroqPrompts().catch(error => {
    console.error(kleur.red('Error:', error));
    process.exit(1);
});
