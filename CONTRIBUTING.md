# Contributing

Use Node.js 22+ and the README development commands. Keep changes focused and
add behavioral regressions for parser, contract, privacy and exit-code changes.

Bug reports should include versions, the command, expected/actual behavior and a
small **synthetic** reproduction. Never attach actual dotenv files or keys.
Feature requests should describe a workflow and desired value-free output.

Keep runtime dependencies at zero. New parsing/constraint features need a clear
bounded syntax and documented compatibility. Do not add user regex execution,
network calls, environment discovery, automatic repair or telemetry.

Contributions are MIT-licensed. 中文反馈同样欢迎。
