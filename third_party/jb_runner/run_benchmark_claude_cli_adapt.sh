#!/bin/bash

# Claude CLI / clawgod Benchmark Runner (JobBench)
# Runs each profession/taskN under jobbench_dataset using Claude Code / clawgod
# For each model, a full independent task folder is copied to /tmp; the model works there
# When the task finishes, output is moved to model_output/{model_name}/ and the temp dir is deleted

set -e

SPLIT="${SPLIT:-main}"
TASKS_BASE_DIR="${TASKS_BASE_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/dataset/${SPLIT}}"
RUN_LABEL="${RUN_LABEL:-}"

find_task_dirs() {
    if [[ -n "${TASK_IDS:-}" ]]; then
        local tid
        for tid in $TASK_IDS; do
            local d="${TASKS_BASE_DIR}/${tid}/task_folder"
            if [[ -d "$d" ]]; then
                echo "$d"
            else
                echo "[WARN] TASK_IDS entry has no task_folder: $d" >&2
            fi
        done
        return
    fi
    find "$TASKS_BASE_DIR" -mindepth 3 -maxdepth 3 -type d -name "task_folder" -path "*/task[0-9]*/task_folder" 2>/dev/null | sort
}

read -r -a BENCHMARK_MODELS_ARRAY <<< "${BENCHMARK_MODELS:?Set BENCHMARK_MODELS}"
MAX_CONCURRENT_PER_MODEL="${MAX_CONCURRENT_PER_MODEL:-1}"
TIMEOUT_PER_TASK="${TIMEOUT_PER_TASK:-3600}"
TRAJ_DIR_NAME="${TRAJ_DIR_NAME:-model_traj}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${TASKS_BASE_DIR}/.harness2-logs"
mkdir -p "$LOG_DIR"

TEMP_WORKSPACE_BASE="/tmp/claude_benchmark_workspace"
mkdir -p "$TEMP_WORKSPACE_BASE"

terminate_descendants() {
    local parent_pid="$1"
    local signal_name="$2"
    local children

    children=$(pgrep -P "$parent_pid" 2>/dev/null || true)
    for child_pid in $children; do
        terminate_descendants "$child_pid" "$signal_name"
        local child_pgid
        child_pgid=$(ps -o pgid= -p "$child_pid" 2>/dev/null | tr -d ' ')
        if [[ -n "$child_pgid" ]]; then
            kill "-${signal_name}" "-${child_pgid}" 2>/dev/null || true
        fi
        kill "-${signal_name}" "$child_pid" 2>/dev/null || true
    done
}

handle_interrupt() {
    local sig="${1:-INT}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Received ${sig}, terminating spawned benchmark processes..."
    terminate_descendants "$$" "TERM"
    sleep 1
    terminate_descendants "$$" "KILL"
    exit 130
}

trap 'handle_interrupt INT' INT
trap 'handle_interrupt TERM' TERM

is_task_completed() {
    local output_dir="$1"
    if [[ -d "$output_dir" ]] && [[ -n "$(ls -A "$output_dir" 2>/dev/null)" ]]; then
        return 0
    fi
    return 1
}

get_safe_model_name() {
    local model="$1"
    echo "$model" | tr '/' '_' | tr '.' '-'
}

get_safe_run_label() {
    local label="$1"
    echo "$label" | tr '/ ' '__' | tr '.' '-'
}

get_output_dir_model_name() {
    local model="$1"
    if [[ -n "${LABEL:-}" ]]; then
        echo "$LABEL"
        return
    fi
    local safe_name
    safe_name=$(get_safe_model_name "$model")
    local output_name="${safe_name}-claudecli"
    if [[ -n "${RUN_LABEL:-}" ]]; then
        output_name="${output_name}-$(get_safe_run_label "$RUN_LABEL")"
    fi
    echo "$output_name"
}

get_traj_dir_model_name() {
    local model="$1"
    get_output_dir_model_name "$model"
}

extract_session_id_from_traj() {
    local traj_file="$1"
    python3 - "$traj_file" <<'PY'
import json
import sys

path = sys.argv[1]
keys = {"session_id", "sessionID", "thread_id", "threadID"}

def walk(obj):
    if isinstance(obj, dict):
        for key in keys:
            value = obj.get(key)
            if isinstance(value, str) and value:
                print(value)
                raise SystemExit(0)
        for value in obj.values():
            walk(value)
    elif isinstance(obj, list):
        for item in obj:
            walk(item)

try:
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                walk(json.loads(line))
            except SystemExit:
                raise
            except Exception:
                continue
except FileNotFoundError:
    pass
PY
}

append_attempt_index() {
    local index_file="$1"
    local task_name="$2"
    local model_id="$3"
    local model_name="$4"
    local attempt="$5"
    local status="$6"
    local exit_code="$7"
    local timeout_seconds="$8"
    local session_id="$9"
    local started_at="${10}"
    local finished_at="${11}"
    local traj_file="${12}"

    if [[ ! -f "$index_file" ]]; then
        printf 'task_name\tmodel_id\tmodel_name\tattempt\tstatus\texit_code\ttimeout_seconds\tsession_id\tstarted_at\tfinished_at\ttraj_file\n' > "$index_file"
    fi

    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
        "$task_name" \
        "$model_id" \
        "$model_name" \
        "$attempt" \
        "$status" \
        "$exit_code" \
        "$timeout_seconds" \
        "$session_id" \
        "$started_at" \
        "$finished_at" \
        "$traj_file" >> "$index_file"
}

run_task() {
    local task_dir="$1"
    local model="$2"
    local model_name="$3"
    local task_parent_dir="$(dirname "$task_dir")"
    local profession=$(basename "$(dirname "$task_parent_dir")")
    local task_name="${profession}_$(basename "$task_parent_dir")"
    local safe_model_name
    safe_model_name=$(get_safe_model_name "$model_name")
    local output_model_name
    output_model_name=$(get_output_dir_model_name "$model_name")
    local traj_model_name
    traj_model_name=$(get_traj_dir_model_name "$model_name")

    local final_output_dir="${task_parent_dir}/model_output/${output_model_name}"
    local traj_output_dir="${task_parent_dir}/${TRAJ_DIR_NAME}/${traj_model_name}"
    local traj_index_file="${traj_output_dir}/attempt_index.tsv"
    local log_file="${LOG_DIR}/jb_${task_name}_${safe_model_name}_$(date +%Y%m%d_%H%M%S).log"
    local attempt=1
    local attempt_stamp
    attempt_stamp="$(date +%Y%m%d_%H%M%S)"
    local attempt_label="attempt${attempt}_${attempt_stamp}"
    local attempt_traj_file="${traj_output_dir}/${task_name}_${traj_model_name}_${attempt_label}.jsonl"
    local attempt_started_at
    attempt_started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

    if is_task_completed "$final_output_dir"; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] SKIP (already completed): $task_name ($model_name)"
        return 0
    fi

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting: $task_name ($model_name)"

    local temp_workspace="${TEMP_WORKSPACE_BASE}/${task_name}_${safe_model_name}_${BASHPID}"
    local temp_task_folder="${temp_workspace}/task_folder"
    local temp_output_dir="${temp_workspace}/output"

    rm -rf "$temp_workspace"
    mkdir -p "$temp_workspace"
    cp -r "$task_dir" "$temp_task_folder"
    mkdir -p "$temp_output_dir"
    mkdir -p "$traj_output_dir"

    # Install workspace harness files for Claude
    if [[ -n "${HARNESS_RENDER_DIR:-}" ]]; then
        local harness_entry
        for harness_entry in CLAUDE.md .claude scripts sub_agents; do
            if [[ -e "${HARNESS_RENDER_DIR}/${harness_entry}" ]]; then
                cp -r "${HARNESS_RENDER_DIR}/${harness_entry}" "${temp_workspace}/${harness_entry}"
            fi
        done
        echo "Harness render dir: ${HARNESS_RENDER_DIR}" | tee -a "$log_file"
    fi

    local instructions_file="${temp_task_folder}/TASK_INSTRUCTIONS.txt"
    if [[ ! -f "$instructions_file" ]]; then
        echo "[ERROR] TASK_INSTRUCTIONS.txt not found in $temp_task_folder" | tee -a "$log_file"
        rm -rf "$temp_workspace"
        return 1
    fi

    local instructions_content
    instructions_content="$(cat "$instructions_file")"

    local prompt_msg="You are an autonomous AI expert working on a complex professional task.

TASK SPECIFICATION:
${instructions_content}

CRITICAL ENVIRONMENT & WORKING INSTRUCTIONS:
- Reference input files are in: ${temp_task_folder}
- Deliverables MUST be saved directly to: ${temp_output_dir}
- Confine work exclusively to: ${temp_workspace}
- Read and adhere strictly to any instructions or guidelines provided in CLAUDE.md."

    local actual_model="$model"
    local reasoning_effort="${REASONING_EFFORT:-high}"

    set +e
    timeout "${TIMEOUT_PER_TASK}s" python3 - "$prompt_msg" "$actual_model" "$temp_workspace" "$log_file" "$reasoning_effort" "$attempt_traj_file" << 'PYTHON_EXEC'
import os
import subprocess
import sys

prompt_content = sys.argv[1]
model = sys.argv[2]
working_dir = sys.argv[3]
log_file = sys.argv[4]
reasoning_effort = sys.argv[5]
traj_file = sys.argv[6]

claude_bin = os.environ.get('HARNESS2_CLAUDE_BIN', 'clawgod')

cmd = [
    claude_bin,
    '-p', prompt_content,
    '--output-format=stream-json',
    '--verbose',
    '--dangerously-skip-permissions',
    '--add-dir', working_dir,
]
if model:
    cmd.extend(['--model', model])
if reasoning_effort:
    cmd.extend(['--effort', reasoning_effort])

with open(log_file, 'a', encoding='utf-8') as log, open(traj_file, 'w', encoding='utf-8') as traj:
    result = subprocess.run(
        cmd,
        cwd=working_dir,
        stdin=subprocess.DEVNULL,
        stdout=traj,
        stderr=log,
        text=True
    )

sys.exit(result.returncode)
PYTHON_EXEC

    local exit_code=$?
    set -e
    local attempt_finished_at
    attempt_finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    local attempt_status="failed"
    local session_id
    session_id="$(extract_session_id_from_traj "$attempt_traj_file")"

    if [[ $exit_code -eq 0 ]] && [[ ! -d "$temp_output_dir" || -z "$(ls -A "$temp_output_dir" 2>/dev/null)" ]]; then
        exit_code=1
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] EMPTY OUTPUT: Task exited successfully but produced no files: $task_name ($model_name)" | tee -a "$log_file"
    fi

    if [[ $exit_code -eq 0 ]]; then
        attempt_status="success"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Task completed successfully: $task_name ($model_name)" | tee -a "$log_file"
    elif [[ $exit_code -eq 124 ]]; then
        attempt_status="timeout"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Task timed out after ${TIMEOUT_PER_TASK}s: $task_name ($model_name)" | tee -a "$log_file"
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Task failed with exit code $exit_code: $task_name ($model_name)" | tee -a "$log_file"
    fi

    append_attempt_index \
        "$traj_index_file" \
        "$task_name" \
        "$model" \
        "$traj_model_name" \
        "$attempt" \
        "$attempt_status" \
        "$exit_code" \
        "$TIMEOUT_PER_TASK" \
        "${session_id:-}" \
        "$attempt_started_at" \
        "$attempt_finished_at" \
        "$attempt_traj_file"

    if [[ -d "$temp_output_dir" ]] && [[ -n "$(ls -A "$temp_output_dir" 2>/dev/null)" ]]; then
        mkdir -p "$final_output_dir"
        mv "$temp_output_dir"/* "$final_output_dir"/
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Output moved to: $final_output_dir" | tee -a "$log_file"
    fi

    rm -rf "$temp_workspace"
    return $exit_code
}

run_model_tasks() {
    local model="$1"
    local model_name="$2"
    local task_dirs=("${@:3}")

    local pids=()
    local failed=0
    local completed=0
    local total=${#task_dirs[@]}

    cleanup_finished_pids() {
        local new_pids=()
        for pid in "${pids[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                new_pids+=("$pid")
            else
                if ! wait "$pid"; then
                    ((failed++)) || true
                fi
                ((completed++)) || true
                echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$model_name] Progress: $completed/$total completed, $failed failed"
            fi
        done
        pids=("${new_pids[@]}")
    }

    for task_dir in "${task_dirs[@]}"; do
        local _parent=$(dirname "$task_dir")
        local task_name="$(basename "$(dirname "$_parent")")_$(basename "$_parent")"
        local final_output_dir="${_parent}/model_output/$(get_output_dir_model_name "$model_name")"

        if is_task_completed "$final_output_dir"; then
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] SKIP (already completed): ${task_name} ($model_name)"
            ((completed++)) || true
            continue
        fi

        while [[ ${#pids[@]} -ge $MAX_CONCURRENT_PER_MODEL ]]; do
            cleanup_finished_pids
            if [[ ${#pids[@]} -ge $MAX_CONCURRENT_PER_MODEL ]]; then
                sleep 2
            fi
        done

        run_task "$task_dir" "$model" "$model_name" &
        pids+=($!)
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Launched: ${task_name} ($model_name) - PID: ${pids[-1]}"
    done

    for pid in "${pids[@]}"; do
        if ! wait "$pid"; then
            ((failed++)) || true
        fi
        ((completed++)) || true
    done

    return $failed
}

main() {
    echo "=========================================="
    echo "Claude / clawgod CLI Benchmark Runner (JobBench)"
    echo "Models: ${BENCHMARK_MODELS_ARRAY[*]}"
    echo "Tasks Base Directory: $TASKS_BASE_DIR"
    echo "Temp Workspace: $TEMP_WORKSPACE_BASE"
    echo "Timeout Per Task: ${TIMEOUT_PER_TASK}s"
    echo "=========================================="

    cd "$SCRIPT_DIR"
    local task_dirs=($(find_task_dirs))
    local total_tasks=${#task_dirs[@]}
    if [[ $total_tasks -eq 0 ]]; then
        echo "No task_folder directories found in $TASKS_BASE_DIR"
        exit 1
    fi

    local num_models=${#BENCHMARK_MODELS_ARRAY[@]}
    local failed=0

    for i in "${!BENCHMARK_MODELS_ARRAY[@]}"; do
        local model="${BENCHMARK_MODELS_ARRAY[$i]}"
        local model_name="${BENCHMARK_MODELS_ARRAY[$i]}"
        if ! run_model_tasks "$model" "$model_name" "${task_dirs[@]}"; then
            ((failed++)) || true
        fi
    done

    if [[ $failed -gt 0 ]]; then
        return 1
    fi
    return 0
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
