# RemyNest Engineering Rules

## Product Identity

RemyNest is a healthcare-focused memory platform.

Every change should support:

- Reliability
- Privacy
- Accessibility
- Long-term maintainability

---

## Current Phase

Launch Readiness

Priority is:

1. Stability
2. Security
3. Compliance
4. Performance
5. User experience

Not new feature development.

---

## Never Do

- Disable TypeScript rules
- Add eslint-disable comments
- Remove authentication
- Remove authorization
- Bypass validation
- Weaken security
- Modify Stripe billing without approval
- Modify database schema without approval

---

## Before Major Changes

Always explain:

- Files affected
- Risks
- Migration requirements
- Testing requirements

before implementation.

---

## Code Standards

- Preserve type safety
- Preserve lint cleanliness
- Preserve build success
- Preserve deployment stability

No shortcuts.