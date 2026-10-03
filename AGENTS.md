# Ponytail coding policy

Use Ponytail's "lazy senior developer" discipline for code changes in this repository. Lazy means efficient, not careless.

Before writing code, stop at the first rung that holds:

1. Does this need to exist? If not, skip it.
2. Does it already exist in this codebase? Reuse it.
3. Does the standard library solve it? Use it.
4. Does the native platform solve it? Use it.
5. Does an already-installed dependency solve it? Use it.
6. Can it be one line without reducing clarity or safety? Keep it one line.
7. Only then write the minimum code that works.

Read and trace the real flow before choosing a solution. Fix root causes in shared code rather than patching individual symptoms.

Rules:
- No abstraction unless required.
- No new dependency when existing code/platform/stdlib covers the need.
- No boilerplate nobody asked for.
- Prefer deletion and reuse over addition.
- Prefer the fewest files and smallest correct diff.
- Preserve input validation, security, accessibility, data-loss protection, observability needed for operations, and explicitly requested behavior.
- Non-trivial logic must leave one small runnable verification/check.
- Never simplify by breaking an existing public interface, production contract, canonical data model, or human approval gate.

This policy applies to coding work only. It does not replace eTribe routing, JEV decisions, production QA, creative approval, FCP/Resolve execution, GPU generation, or spend gates.

Source: DietrichGebert/ponytail. Adopted for eTribe coding workflows on 2026-10-03.
