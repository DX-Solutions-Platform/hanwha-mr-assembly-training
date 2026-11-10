param([string]$ModelDirectory = (Join-Path $PSScriptRoot '../.local-ai/models/qwen3.8-27b-w4a16-awq-gptq'))

$ErrorActionPreference = 'Stop'
$model = 'soyrsoyr/Qwen3.8-27B-W4A16-AWQ-GPTQ'
$revision = 'a1b8f1570ecc09758c8431fd536c88e3b209674f'
$modelFiles = @(
    'config.json', 'generation_config.json', 'model.safetensors.index.json',
    'tokenizer.json', 'tokenizer_config.json', 'chat_template.jinja',
    'preprocessor_config.json', 'video_preprocessor_config.json',
    'model-00001-of-00002.safetensors', 'model-00002-of-00002.safetensors', 'model-mtp.safetensors'
)
$previous = $env:HF_HUB_DISABLE_XET
try {
    $env:HF_HUB_DISABLE_XET = '1'
    # Benchmark folders in this snapshot contain characters that Windows paths cannot use.
    uvx --from huggingface-hub hf download $model @modelFiles --revision $revision --local-dir $ModelDirectory
    if ($LASTEXITCODE -ne 0) { throw "AWQ model download failed ($LASTEXITCODE)." }
} finally {
    $env:HF_HUB_DISABLE_XET = $previous
}
