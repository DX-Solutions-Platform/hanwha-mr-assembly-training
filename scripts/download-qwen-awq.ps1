param([string]$ModelDirectory = 'D:\models\qwen3.5-27b-awq-4bit')

$ErrorActionPreference = 'Stop'
$model = 'cyankiwi/Qwen3.5-27B-AWQ-4bit'
$revision = '9d8d63632afafe90bdfcb70164d3e2a0955619f7'
$previous = $env:HF_HUB_DISABLE_XET
try {
    # Use resumable HTTP downloads on Windows hosts that cannot reach Xet CAS.
    $env:HF_HUB_DISABLE_XET = '1'
    uvx --from huggingface-hub hf download $model --revision $revision --local-dir $ModelDirectory
    if ($LASTEXITCODE -ne 0) { throw "AWQ model download failed ($LASTEXITCODE). Rerun to resume." }
} finally {
    $env:HF_HUB_DISABLE_XET = $previous
}
