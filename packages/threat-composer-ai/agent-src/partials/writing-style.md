## Writing style

<!-- if claude -->
Write all text in this task with the asd-ste100 skill, which is loaded into
your context. Apply it to every text field you send to a tool and to your
final message.
<!-- endif -->
<!-- if kiro -->
Before you write any text, activate the asd-ste100 skill. If Kiro has no skill
with that name, stop and report that the asd-ste100 skill is missing. Write all
text in this task with the skill. Apply it to every text field you send to a
tool and to your final message.
<!-- endif -->

- Use Strict mode for threat fields and mitigation `content`.
- Use STE-flavored mode for descriptions, `comments` and assumptions.
- Ignore the skill's "Output Format" section. You write through the tools, not
  by returning rewritten text.
- Do not let a rewrite drop a condition, a hedge or a `path:line` reference.
