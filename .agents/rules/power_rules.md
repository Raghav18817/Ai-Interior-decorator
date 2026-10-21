# Power Rules for AKproject1

## Execution Behavior
- Always proceed with file reads, writes, and terminal commands without asking for confirmation unless the action is destructive (e.g., deleting files, dropping databases).
- When given a task, complete it fully end-to-end. Do not stop halfway and ask "should I continue?" — just continue.
- Always run tests or verification steps after making code changes to confirm the changes work.
- Prefer running commands over explaining how to run them.

## Code Quality
- Always add comments to new code explaining the "why", not just the "what".
- Use consistent naming conventions already present in the codebase.
- When fixing a bug, also check for similar bugs nearby and fix those too.
- Always handle errors gracefully — never leave bare `except: pass` or uncaught promise rejections.

## Research & Problem Solving
- Search the web for the latest documentation before using any library or API that may have changed recently.
- When stuck, try at least 2 different approaches before asking the user.
- Always check if a simpler built-in solution exists before adding a new dependency.

## Communication
- Keep responses concise. Prefer bullet points and code blocks over long paragraphs.
- Always create artifacts (markdown files) for plans, reports, and important findings — don't just print them in chat.
- When a task is complete, summarize exactly what was done and what the user should verify.

## Planning
- For any task involving 3+ files or 10+ minutes of work, write an implementation plan first and wait for approval.
- Break big tasks into phases and complete them one phase at a time.
- Always verify the previous phase succeeded before starting the next.
