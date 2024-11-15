#!/usr/bin/env node

require('dotenv').config();
const kleur = require('kleur');
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const { parseArguments, processPrompts } = require('./llm_utils');

// Default model constant
const BEDROCK_DEFAULT_MODEL = 'us.anthropic.claude-3-5-haiku-20241022-v1:0';

// Parse command line arguments
const argv = parseArguments({
    defaultModel: BEDROCK_DEFAULT_MODEL,
    modelDescription: 'Specify the model to use',
    modelEnvVar: 'BEDROCK_DEFAULT_MODEL'
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

// Function to make Bedrock API call
async function getCompletion(prompt) {
    const startTime = Date.now();
    
    try {
        const input = {
            modelId: MODEL,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 1024,
                top_k: 250,
                temperature: 1,
                top_p: 0.999,
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
            })
        };

        const command = new InvokeModelCommand(input);
        const response = await bedrockClient.send(command);

        // Parse the response
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const endTime = Date.now();
        const duration = endTime - startTime;

        return {
            response: responseBody.content[0].text,
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
    provider: 'bedrock-anthropic'
}).catch(error => {
    console.error(kleur.red('Error:', error));
    process.exit(1);
});
