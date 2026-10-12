# Documentation is the specification

1. Record new requests in docs/docs/requirements.md as open before implementation.
2. Read the governing documentation; when it disagrees with code, code is the defect.
3. Change behavioral documentation before changing code.
4. Implement the documented behavior in JavaScript.
5. Verify unit/browser tests, the no-build Node/SQLite server, and rendered changes in a real browser. Do not add an app build step.
6. Log every documentation-page edit in docs/docs/changelog.md with why it was made. Update requirements with named verification evidence. Never claim unexercised behavior works.
