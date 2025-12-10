import { MonorepoTsProject } from "@aws/pdk/monorepo";
import { DependencyType } from "projen";
import { UvPythonProject } from "./uv-python-project";

export default class ThreatComposerPythonAIProject extends UvPythonProject {
  constructor(parent: MonorepoTsProject) {
    super({
      parent,
      outdir: "packages/threat-composer-ai",
      name: "threat-composer-ai",
      moduleName: "threat_composer_ai",
      authorEmail: "threat-model-workshop@amazon.com",
      pythonExec: "python3",
      pytest: true,
      authorName: "Threat Composer team",
      version: "0.1.1",
      description: "AI-powered automated threat modeling for codebases",
      license: "Apache-2.0",
      sample: false,

      // Core dependencies
      deps: [
        "strands-agents",
        "strands-agents-tools",
        "click",
        "boto3",
        "botocore",
        "rich",
        "json-schema-to-pydantic",
        "pathspec",
        "psutil",
        "opentelemetry-api",
        "opentelemetry-sdk",
        "opentelemetry-exporter-otlp-proto-http",
        "opentelemetry-propagator-aws-xray",
        "opentelemetry-instrumentation-fastapi",
        "fastmcp",
      ],

      // Development dependencies
      devDeps: [
        "pytest",
        "pytest-mock",
        "pytest-cov",
        "pytest-asyncio",
        "ruff",
      ],

      // UV-specific configuration
      uvManaged: true,

      // Console scripts
      scripts: {
        "threat-composer-ai-cli": "threat_composer_ai.__main__:main",
        "threat-composer-ai-mcp": "threat_composer_ai.mcp_server:main",
      },
    });

    // Add dev dependencies
    this.deps.addDependency("ruff", DependencyType.TEST);
    this.deps.addDependency("pytest-mock", DependencyType.TEST);
    this.deps.addDependency("pytest-cov", DependencyType.TEST);
    this.deps.addDependency("pytest-asyncio", DependencyType.TEST);

    // Configure the test task to run all tests
    this.testTask.reset();
    this.testTask.exec("uv run pytest tests/");

    // Add Ruff linting task
    this.addTask("lint", {
      description: "Run Ruff linter and formatter",
      steps: [
        {
          exec: "uv run ruff check .",
        },
        {
          exec: "uv run ruff format --check .",
        },
      ],
    });

    // Add Ruff fix task
    this.addTask("lint:fix", {
      description: "Run Ruff linter and formatter with fixes",
      steps: [
        {
          exec: "uv run ruff check --fix .",
        },
        {
          exec: "uv run ruff format .",
        },
      ],
    });

    // Add Ruff configuration to pyproject.toml
    this.tryFindObjectFile("pyproject.toml")?.addOverride("tool.ruff", {
      "line-length": 88,
      "target-version": "py310",
      exclude: [
        ".git",
        "__pycache__",
        ".venv",
        ".eggs",
        "*.egg",
        "dist",
        "build",
      ],
    });

    this.tryFindObjectFile("pyproject.toml")?.addOverride("tool.ruff.lint", {
      select: [
        "E", // pycodestyle errors
        "W", // pycodestyle warnings
        "F", // pyflakes
        "I", // isort
        "B", // flake8-bugbear
        "C4", // flake8-comprehensions
        "UP", // pyupgrade
      ],
      ignore: [
        "E501", // line too long, handled by formatter
      ],
    });

    this.tryFindObjectFile("pyproject.toml")?.addOverride("tool.ruff.format", {
      "quote-style": "double",
      "indent-style": "space",
      "skip-magic-trailing-comma": false,
      "line-ending": "auto",
    });

    // Override the dev dependencies to include Ruff and other tools
    this.tryFindObjectFile("pyproject.toml")?.addOverride(
      "dependency-groups.dev",
      ["pytest==7.4.3", "pytest-mock", "pytest-cov", "pytest-asyncio", "ruff"]
    );
  }
}
