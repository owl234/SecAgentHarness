"""ClaudeAgent -- a Claude Code (clawgod-compatible) BaseInstalledAgent for the external
bench: generated settings, one non-interactive turn, event stream mapped to ATIF."""

from __future__ import annotations

import base64
import json
import shlex
from pathlib import Path

from harbor.agents.installed.base import BaseInstalledAgent
from harbor.environments.base import BaseEnvironment
from harbor.models.agent.context import AgentContext
from harbor.models.trajectories.agent import Agent
from harbor.models.trajectories.final_metrics import FinalMetrics
from harbor.models.trajectories.metrics import Metrics
from harbor.models.trajectories.step import Step
from harbor.models.trajectories.tool_call import ToolCall
from harbor.models.trajectories.trajectory import Trajectory

from workbuddy_bench.agents._agent_user import ensure_agent_user

_OUTPUT_FILENAME = "claude-output.jsonl"
_STDERR_FILENAME = "claude-stderr.log"

_CLAUDE_HOME_SUBDIR = ".claude-adapt"


class ClaudeAgent(BaseInstalledAgent):
    """Claude Code CLI agent (installed-CLI harness) for harbor."""

    SUPPORTS_ATIF: bool = True

    def __init__(self, logs_dir: Path, *args, **kwargs):
        self._claude_version: str | None = kwargs.pop("CLAUDE_VERSION", None)
        self._bin_dir = str(kwargs.pop("CLAUDE_BIN_DIR", "/opt/claude")).rstrip("/")
        # The model id claude sends to the endpoint; mirrors CODEX_MODEL / OPENCODE route.
        self._claude_model = str(kwargs.pop("CLAUDE_MODEL", ""))
        model_params = kwargs.pop("model_params", None) or {}
        self._max_output_tokens = model_params.get("max_output_tokens")
        effort = kwargs.pop("CLAUDE_EFFORT", None)
        if effort is None:
            extra_body = model_params.get("extra_body") or {}
            effort = extra_body.get("reasoning_effort")
        self._effort: str | None = str(effort) if effort else None
        connection = kwargs.pop("connection", None) or {}
        self._conn_mode = str(connection.get("mode") or "direct")
        cw = kwargs.pop("context_window", None)
        self._context_window: int | None = int(cw) if cw is not None else None
        kwargs.pop("CLAUDE_MAX_TURNS", None)
        kwargs.pop("context_compact_pct", None)
        kwargs.pop("settings_preset", None)
        kwargs.pop("models_preset", None)
        kwargs.pop("mount_path", None)
        kwargs.pop("instance_id", None)
        super().__init__(logs_dir, *args, version=self._claude_version, **kwargs)

    @staticmethod
    def name() -> str:
        return "claude"

    def get_version_command(self) -> str | None:
        return 'export PATH="/usr/local/bin:$PATH"; claude --version'

    def parse_version(self, stdout: str) -> str:
        out = (stdout or "").strip()
        return out.split()[-1] if out else out

    async def install(self, environment: BaseEnvironment) -> None:
        """Link the bind-mounted binary onto PATH and refuse anything but the pinned build."""
        bin_path = f"{self._bin_dir}/claude"
        want = self._claude_version or ""
        await self.exec_as_root(
            environment,
            command=(
                f'if [ ! -x "{bin_path}" ]; then '
                f'echo "ERROR: claude binary not found at {bin_path}." >&2; '
                f'echo "  The job must bind-mount the staged dist (read-only):" >&2; '
                f'echo "  environment_override.mounts: [{{type: bind, '
                f'source: dependencies/claude/dist, target: {self._bin_dir}}}]" >&2; '
                f"exit 1; fi && "
                f'ln -sf "{bin_path}" /usr/local/bin/claude && '
                f'v="$(/usr/local/bin/claude --version 2>&1)" && '
                f'echo "claude version: $v" && '
                + (
                    f'case "$v" in *"{want}"*) : ;; *) '
                    f'echo "ERROR: mounted claude is \'$v\', pinned CLAUDE_VERSION is '
                    f'{want}. Refusing to run an unpinned build — point '
                    f'the Claude mount at a staged {want} dist or repin the '
                    f'harness version." >&2; '
                    f"exit 1;; esac"
                    if want else "true"
                )
            ),
        )
        await ensure_agent_user(self, environment)

    async def run(
        self, instruction: str, environment: BaseEnvironment, context: AgentContext
    ) -> None:
        instruction = self.render_instruction(instruction)
        await self._run_claude(environment,
                               escaped_instruction=shlex.quote(instruction))

    async def _run_claude(
        self, environment: BaseEnvironment, *,
        escaped_instruction: str,
    ) -> None:
        """Run one non-interactive `claude -p` turn with the stream captured to /logs."""
        # `docker exec -u <user>` inherits a baked ENV HOME the agent user may not be able
        # to write, so HOME is re-derived from the running user's passwd entry.
        home_fix = 'export HOME="$(getent passwd "$(id -u)" | cut -d: -f6)"; '
        claude_home = f'"$HOME/{_CLAUDE_HOME_SUBDIR}"'
        setup_cmd = f"{home_fix}mkdir -p {claude_home}"
        await self.exec_as_agent(environment, command=setup_cmd)

        output_path = f"/logs/agent/{_OUTPUT_FILENAME}"
        stderr_path = f"/logs/agent/{_STDERR_FILENAME}"
        flags = [
            "-p", escaped_instruction,
            "--output-format=stream-json",
            "--verbose",
            "--dangerously-skip-permissions",
            "--include-hook-events",
        ]
        if self._claude_model:
            flags += ["--model", shlex.quote(self._claude_model)]
        if self._effort:
            flags += ["--effort", shlex.quote(self._effort)]
        run_cmd = (
            'export PATH="/usr/local/bin:$PATH"; '
            f"{home_fix}"
            f"claude {' '.join(flags)} "
            f"--add-dir /workspace -C /workspace "
            f"</dev/null 2>{stderr_path} | tee {output_path}"
        )
        await self.exec_as_agent(environment, command=run_cmd)

    def populate_context_post_run(self, context: AgentContext) -> None:
        events = self._read_events()
        if events is None:
            return
        trajectory = self._build_trajectory(events)
        if trajectory:
            traj_path = self.logs_dir / "trajectory.json"
            try:
                with open(traj_path, "w", encoding="utf-8") as fh:
                    json.dump(trajectory.to_json_dict(), fh, indent=2, ensure_ascii=False)
            except (OSError, AttributeError) as exc:
                self.logger.debug("Failed writing trajectory.json: %s", exc)
            fm = trajectory.final_metrics
            if fm:
                context.n_input_tokens = fm.total_prompt_tokens or 0
                context.n_output_tokens = fm.total_completion_tokens or 0
                context.n_cache_tokens = fm.total_cached_tokens or 0
                if fm.total_cost_usd is not None:
                    context.cost_usd = fm.total_cost_usd

    def _read_events(self) -> list[dict] | None:
        out = self.logs_dir / _OUTPUT_FILENAME
        if not out.is_file():
            self.logger.warning(
                "claude output not found: %s — token/cost context will be empty "
                "(check the /logs/agent mount)", out)
            return None
        events: list[dict] = []
        try:
            for line in out.read_text(encoding="utf-8", errors="replace").splitlines():
                line = line.strip()
                if not line.startswith("{"):
                    continue
                try:
                    ev = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if isinstance(ev, dict):
                    events.append(ev)
        except OSError as exc:
            self.logger.debug("Failed reading claude output: %s", exc)
            return None
        return events

    def _build_trajectory(self, events: list[dict]) -> Trajectory | None:
        """Map claude's `-p --output-format=stream-json` stream to an ATIF Trajectory.

        One Step per `result` boundary is overkill for single-turn runs, so a whole
        run usually becomes one Step: assistant text + thinking accumulate, every
        tool_use becomes a ToolCall, usage on `result` feeds FinalMetrics.
        """
        steps: list[Step] = []
        text_parts: list[str] = []
        reasoning_parts: list[str] = []
        tool_calls: list[ToolCall] = []
        session_id: str | None = None
        total_in = total_out = total_cache = 0
        errors: list = []
        total_cost: float | None = None
        step_id = 1

        def flush(metrics: Metrics | None) -> None:
            nonlocal text_parts, reasoning_parts, tool_calls, step_id
            reasoning = "\n".join(p for p in reasoning_parts if p) or None
            steps.append(Step(
                step_id=step_id,
                source="agent",
                model_name=self._claude_model,
                message="\n".join(p for p in text_parts if p),
                reasoning_content=reasoning if metrics else None,
                tool_calls=tool_calls or None,
                metrics=metrics,
                llm_call_count=1 if metrics else 0,
            ))
            text_parts, reasoning_parts, tool_calls = [], [], []
            step_id += 1

        for ev in events:
            etype = ev.get("type", "")
            session_id = session_id or ev.get("session_id")
            if etype == "assistant":
                msg = ev.get("message") if isinstance(ev.get("message"), dict) else {}
                content = msg.get("content") if isinstance(msg, dict) else None
                if not isinstance(content, list):
                    continue
                for blk in content:
                    if not isinstance(blk, dict):
                        continue
                    btype = blk.get("type")
                    if btype == "text":
                        txt = blk.get("text", "")
                        if isinstance(txt, str) and txt.strip():
                            text_parts.append(txt)
                    elif btype == "thinking":
                        thk = blk.get("thinking", "")
                        if isinstance(thk, str) and thk.strip():
                            reasoning_parts.append(thk)
                    elif btype == "tool_use":
                        tool_calls.append(ToolCall(
                            tool_call_id=str(blk.get("id") or ""),
                            function_name=str(blk.get("name") or "tool"),
                            arguments=blk.get("input")
                            if isinstance(blk.get("input"), dict) else {},
                        ))
            elif etype == "result":
                usage = ev.get("usage") if isinstance(ev.get("usage"), dict) else {}
                t_in = int(usage.get("input_tokens") or 0)
                t_out = int(usage.get("output_tokens") or 0)
                t_cache = int(usage.get("cache_read_input_tokens") or 0)
                total_in += t_in
                total_out += t_out
                total_cache += t_cache
                cost = ev.get("total_cost_usd")
                if isinstance(cost, (int, float)):
                    total_cost = (total_cost or 0.0) + float(cost)
                res = ev.get("result")
                if isinstance(res, str) and res.strip():
                    text_parts.append(res)
                if ev.get("is_error") or ev.get("subtype") not in (None, "success"):
                    errors.append({"message": str(res)[:300] if res else ev.get("subtype")})
                flush(Metrics(prompt_tokens=t_in, completion_tokens=t_out))
            elif etype == "error" or ev.get("is_error"):
                msg = ev.get("message") or ev.get("error") or json.dumps(ev)[:300]
                errors.append({"message": str(msg)[:300]})

        if text_parts or reasoning_parts or tool_calls:
            flush(None)

        if not steps and not errors:
            return None
        if not steps:
            steps.append(Step(
                step_id=1,
                source="agent",
                model_name=self._claude_model,
                message=f"run produced no steps; {len(errors)} error event(s): "
                        + "; ".join(json.dumps(e)[:300] for e in errors[:3]),
                llm_call_count=0,
            ))

        extra: dict = {"steps": len(steps), "model_route": self.model_name,
                       "conn_mode": self._conn_mode}
        if errors:
            extra["claude_errors"] = errors

        notes = (
            "claude -p --output-format=stream-json emits assistant/user/result events; "
            "usage on `result` feeds totals. One Step = one result boundary; a trailing "
            "run with no closing result becomes a final Step with llm_call_count == 0."
        )
        if errors:
            notes += f" RUN REPORTED {len(errors)} error event(s); see extra.claude_errors."

        return Trajectory(
            session_id=session_id,
            agent=Agent(name="claude", version=self._version or "unknown",
                        model_name=self._claude_model),
            steps=steps,
            final_metrics=FinalMetrics(
                total_prompt_tokens=total_in,
                total_completion_tokens=total_out,
                total_cached_tokens=total_cache,
                total_cost_usd=total_cost,
                total_steps=len(steps),
                extra=extra,
            ),
            notes=notes,
        )
