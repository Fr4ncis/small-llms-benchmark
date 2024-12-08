const fs = require('fs');
const path = require('path');
const kleur = require('kleur');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Constants
const OUTPUT_DIR = 'output';

/**
 * Configure and parse command line arguments
 * @param {Object} config Configuration object containing model defaults and options
 * @returns {Object} Parsed command line arguments
 */
function parseArguments(config) {
    const { defaultModel, modelDescription, additionalOptions = {} } = config;
    
    let yargsInstance = yargs(hideBin(process.argv))
        .option('model', {
            alias: 'm',
            description: modelDescription || 'Specify the model to use',
            type: 'string',
            default: process.env[config.modelEnvVar] || defaultModel
        });

    // Add any additional options
    Object.entries(additionalOptions).forEach(([key, option]) => {
        yargsInstance = yargsInstance.option(key, option);
    });

    return yargsInstance
        .help()
        .alias('help', 'h')
        .argv;
}

/**
 * Read and validate prompts from the prompts.json file
 * @returns {Array} Array of prompts
 */
function readPrompts() {
    const promptsPath = path.join(process.cwd(), 'prompts.json');
    if (!fs.existsSync(promptsPath)) {
        console.error(kleur.red('Error: prompts.json file not found'));
        process.exit(1);
    }
    
    try {
        const fileContent = fs.readFileSync(promptsPath, 'utf8');
        let inputData;
        
        try {
            inputData = JSON.parse(fileContent);
        } catch (parseError) {
            console.error(kleur.red('Error parsing prompts.json:', parseError.message));
            process.exit(1);
        }

        if (!inputData.prompts || !Array.isArray(inputData.prompts)) {
            console.error(kleur.red('Error: Invalid prompts.json format. Expected {"prompts": [...]}'));
            process.exit(1);
        }
                
        // Validate that each prompt has the required structure
        for (let i = 0; i < inputData.prompts.length; i++) {
            const prompt = inputData.prompts[i];
            if (!prompt || typeof prompt !== 'object') {
                console.error(kleur.red(`Error: Invalid prompt at index ${i}. Expected an object, got ${typeof prompt}`));
                process.exit(1);
            }
            if (!prompt.title || !prompt.prompt) {
                console.error(kleur.red(`Error: Invalid prompt at index ${i}. Each prompt must have 'title' and 'prompt' fields`));
                process.exit(1);
            }
        }

        return inputData.prompts;
    } catch (error) {
        console.error(kleur.red(`Error reading prompts.json: ${error.message}`));
        if (error.stack) {
            console.error(kleur.red('Stack trace:', error.stack));
        }
        process.exit(1);
    }
}

/**
 * Ensure output directory exists
 */
function ensureOutputDirectory() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR);
    }
}

/**
 * Process prompts using the provided completion function
 * @param {Function} getCompletion Function to get completion for a prompt
 * @param {Object} config Configuration object containing model and provider info
 * @returns {Promise<void>}
 */
async function processPrompts(getCompletion, config) {
    const { model, provider } = config;
    const prompts = readPrompts();
    ensureOutputDirectory();

    let totalDuration = 0;
    let outputContent = '';

    // Process each prompt
    for (let i = 0; i < prompts.length; i++) {
        const { title, prompt } = prompts[i];
        console.log(`\n${kleur.cyan(`Test ${i + 1} [${title}]: ${prompt}`)}`);

        const result = await getCompletion(prompt);
        console.log(kleur.green(`Response: ${result.response}`));
        console.log(kleur.yellow(`Time taken: ${result.duration}ms`));

        // Append to output content
        outputContent += `Test ${i + 1} [${title}]\n`;
        outputContent += `Prompt: ${prompt}\n`;
        outputContent += `Response: ${result.response}\n`;
        outputContent += `Time: ${result.duration}ms\n\n`;
        
        totalDuration += result.duration;
    }

    // Add summary section
    outputContent += '=== Summary ===\n';
    outputContent += `Model used: ${model}\n`;
    outputContent += `Total time: ${totalDuration}ms\n`;

    // Write output file
    const outputPath = path.join(OUTPUT_DIR, `${provider}-${model.toLowerCase().replace(/[^a-zA-Z0-9-_]/g, '-')}.txt`);
    fs.writeFileSync(outputPath, outputContent);

    // Print summary
    console.log('\n' + kleur.magenta(`Model used: ${model}`));
    console.log(kleur.yellow(`Total time for all responses: ${totalDuration}ms`));
}

module.exports = {
    parseArguments,
    readPrompts,
    ensureOutputDirectory,
    processPrompts
};
