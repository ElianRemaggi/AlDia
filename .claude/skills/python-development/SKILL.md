---
name: python-development
description: Modern Python 3.12+ development toolkit with sub-skills, agents, and scaffolding commands. Use when building Python services, microservices, async workers, or any Python application requiring production-ready patterns.
license: MIT
metadata:
  author: Seth Hobson
  version: "1.2.2"
---

# Python Development Toolkit

Comprehensive Python development package for modern Python 3.12+ applications. Covers async patterns, background jobs, testing, type safety, observability, and project structure.

## When to Apply

Reference when:
- Building Python microservices or background workers
- Setting up a new Python project with modern tooling (uv, ruff, pyright)
- Implementing task queues, async processing, or resilient services
- Reviewing Python code for anti-patterns, style, or type safety

## Sub-Skills

| Sub-Skill | Description |
|-----------|-------------|
| `async-python-patterns` | asyncio, concurrent programming, non-blocking I/O |
| `python-background-jobs` | Task queues, workers, event-driven architecture (Celery, RQ) |
| `python-resilience` | Retries, exponential backoff, timeouts, fault tolerance |
| `python-error-handling` | Exception hierarchies, validation, partial failure handling |
| `python-testing-patterns` | pytest, fixtures, mocking, TDD |
| `python-type-safety` | Type hints, generics, Protocols, mypy/pyright |
| `python-observability` | Structured logging, metrics, distributed tracing |
| `python-design-patterns` | KISS, SRP, composition over inheritance |
| `python-anti-patterns` | Common mistakes checklist for code review |
| `python-code-style` | ruff, naming conventions, docstrings |
| `python-configuration` | pydantic-settings, env vars, secrets management |
| `python-project-structure` | Module architecture, public API design |
| `python-resource-management` | Context managers, cleanup, streaming |
| `python-performance-optimization` | cProfile, memory profilers, bottleneck identification |
| `python-packaging` | pyproject.toml, PyPI distribution |
| `uv-package-manager` | uv for dependency management and virtual environments |

## Agents

- `python-pro` — General Python expert (Python 3.12+, async, uv, ruff, FastAPI)
- `fastapi-pro` — FastAPI specialist
- `django-pro` — Django specialist

## Commands

- `python-scaffold` — Scaffolds a complete production-ready Python project (FastAPI, Django, Library, or CLI)

## How to Use

For detailed guidance, read individual sub-skill files:

```
skills/python-background-jobs/SKILL.md
skills/async-python-patterns/SKILL.md
skills/python-testing-patterns/SKILL.md
```
