# Small LLMs Benchmark

A benchmarking tool for comparing various LLM providers and models, including smaller and more efficient alternatives to large-scale models.

## Supported Providers

- OpenAI (GPT-4)
- Anthropic (Claude 3)
- AWS Bedrock
  - Claude
  - Llama
  - Nova
- Groq
- Cerebras
- LMStudio
- Ollama (local and RunPod)

## Project Structure

```
.
├── process_*_prompts.js  # Processing scripts for each provider
├── llm_utils.js         # Shared utilities
├── prompts.json         # Test prompts
└── output/              # Benchmark results
    ├── results.csv      # Aggregated results
    └── */               # Provider-specific outputs
```

## Requirements

- Node.js
- API keys for respective providers (configured in .env)

## Usage

1. Configure provider credentials in `.env`
2. Run individual provider scripts:
```bash
node process_<provider>_prompts.js
```

Results are saved to `output/` directory in both aggregated (CSV) and individual formats.
