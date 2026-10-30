# Env Contract report

6 declared · 1 valid · 4 error findings · 1 warning findings

Values are omitted. Variable names and line numbers may still be sensitive; review reports before sharing. This checks a supplied contract, not application behavior or secret safety.

| Variable | Status | Line | Findings |
| --- | --- | --- | --- |
| API\_TOKEN | valid | 3 | — |
| API\_URL | error | 2 | INVALID_TYPE: Expected an absolute network URL with a hostname\. |
| APP\_PORT | error | 4 | ABOVE_MAXIMUM: Value is above the configured maximum\. |
| DEBUG | error | — | MISSING_VARIABLE: Required variable is missing\. |
| EXTRA\_SETTING | warning | 6 | UNEXPECTED_VARIABLE: Variable is not declared in the contract\. |
| MODE | error | 5 | ENUM_MISMATCH: Value is not among the configured choices\. |
| OPTIONAL\_LABEL | optional-missing | — | — |
