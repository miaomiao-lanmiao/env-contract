# Security policy

The latest 0.1.x source receives fixes. Use private GitHub vulnerability reporting
when available; otherwise request a private contact channel without posting
secrets or exploitation details. Initial acknowledgement target: 7 days.

The CLI treats explicitly supplied dotenv values as data. It does not populate
process.env, expand references, execute substitutions, import files or access the
network. Use --dotenv; Node's own --env-file/preload options belong to the trusted
runtime and are outside application control.

Reports omit configuration values but expose names/line numbers. This is contract
validation, not a comprehensive secret scanner, encrypted storage or proof that
an application is configured safely. Review reports before sharing.

Trust the installed Node runtime and local filesystem. Static source checks and
regression tests establish bounded evidence, not an absolute security guarantee.
