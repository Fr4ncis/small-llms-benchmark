#!/usr/bin/env node

require('dotenv').config();
const kleur = require('kleur');
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const { parseArguments, processPrompts } = require('./llm_utils');

// Default model constant
const BEDROCK_NOVA_DEFAULT_MODEL = 'us.amazon.nova-micro-v1:0';

// Parse command line arguments
const argv = parseArguments({
    defaultModel: BEDROCK_NOVA_DEFAULT_MODEL,
    modelDescription: 'Specify the Nova model to use',
    modelEnvVar: 'BEDROCK_NOVA_DEFAULT_MODEL'
});

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

// Function to make Bedrock Nova API call
async function getCompletion(prompt) {
    const startTime = Date.now();
    
    try {
        const input = {
            modelId: MODEL,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({

                messages: [
                    {
                        role: "user",
                        content: [
                            {text: prompt}
                        ]
                    }
                ]
            })
        };

        const command = new InvokeModelCommand(input);
        const response = await bedrockClient.send(command);

        // Parse the response
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const endTime = Date.now();
        const duration = endTime - startTime;

        return {
            response: responseBody.output.message.content[0].text,
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
processPrompts(getCompletion, {
    model: MODEL,
    provider: 'bedrock-nova'
}).catch(error => {
    console.error(kleur.red('Error:', error));
    process.exit(1);
});
