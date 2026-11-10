#!/usr/bin/env bash
set -euo pipefail

runtime_dir="${XDG_DATA_HOME:-$HOME/.local/share}/hanwha-qwen-awq"
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
model_dir="${2:-$project_dir/.local-ai/models/qwen3.8-27b-w4a16-awq-gptq}"
model_name="soyrsoyr/Qwen3.8-27B-W4A16-AWQ-GPTQ"
previous_model_name="cyankiwi/Qwen3.5-27B-AWQ-4bit"

case "${1:-serve}" in
  stop)
    # Only stop this application's vLLM service, including instances started manually.
    while read -r pid args; do
      if [[ "$args" == *"$runtime_dir/venv/bin/vllm serve "* &&
            ( "$args" == *" --served-model-name $model_name "* ||
              "$args" == *" --served-model-name $previous_model_name "* ) &&
            "$args" == *" --port 18080 "* ]]; then
        kill -TERM "$pid" 2>/dev/null || continue
        for ((attempt = 0; attempt < 100; attempt++)); do
          kill -0 "$pid" 2>/dev/null || break
          sleep .2
        done
        if kill -0 "$pid" 2>/dev/null; then
          printf '%s\n' 'The local 27B process did not stop in time.' >&2
          exit 1
        fi
      fi
    done < <(ps -u "$(id -u)" -o pid=,args=)
    ;;
  install)
    mkdir -p "$runtime_dir"
    if command -v uv >/dev/null; then
      uv_bin="$(command -v uv)"
    else
      python3 -m venv "$runtime_dir/bootstrap"
      "$runtime_dir/bootstrap/bin/pip" install "uv==0.13.1"
      uv_bin="$runtime_dir/bootstrap/bin/uv"
    fi
    "$uv_bin" venv --python 3.12 "$runtime_dir/venv"
    "$uv_bin" pip install --python "$runtime_dir/venv/bin/python" --torch-backend=auto "vllm==0.33.0"
    ;;
  serve)
    if [[ ! -x "$runtime_dir/venv/bin/vllm" ]]; then
      printf '%s\n' 'Run this script with install inside WSL2 first.' >&2
      exit 1
    fi
    for file in config.json generation_config.json model.safetensors.index.json \
      tokenizer.json tokenizer_config.json chat_template.jinja \
      preprocessor_config.json video_preprocessor_config.json \
      model-00001-of-00002.safetensors model-00002-of-00002.safetensors model-mtp.safetensors; do
      if [[ ! -s "$model_dir/$file" ]]; then
        printf 'Missing local AWQ model file: %s\n' "$model_dir/$file" >&2
        exit 1
      fi
    done
    export HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 VLLM_NO_USAGE_STATS=1 DO_NOT_TRACK=1
    # This WSL runtime uses bundled CUDA kernels without a system CUDA toolkit.
    export VLLM_USE_FLASHINFER_SAMPLER=0
    exec 9>"$runtime_dir/serve.lock"
    flock -n 9
    exec "$runtime_dir/venv/bin/vllm" serve "$model_dir" \
      --served-model-name "$model_name" --host 127.0.0.1 --port 18080 \
      --max-model-len 4096 --max-num-seqs 1 --gpu-memory-utilization 0.90 \
      --limit-mm-per-prompt '{"image":{"count":1,"width":1024,"height":1024},"video":0}' \
      --safetensors-load-strategy prefetch --gdn-prefill-backend triton --enforce-eager \
      --reasoning-parser qwen3
    ;;
  *)
    printf '%s\n' 'Usage: qwen-awq-wsl.sh {install|serve|stop} [local-model-directory]' >&2
    exit 2
    ;;
esac
