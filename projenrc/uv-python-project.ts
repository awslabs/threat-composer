import { Component } from "projen";
import { PythonProject, PythonProjectOptions } from "projen/lib/python";
import { TomlFile } from "projen/lib/toml";

export interface UvPythonProjectOptions extends PythonProjectOptions {
  /**
   * Whether uv manages the virtual environment
   * @default true
   */
  readonly uvManaged?: boolean;

  /**
   * Console script entry points
   * @example { "my-script": "mypackage.module:main" }
   */
  readonly scripts?: Record<string, string>;
}

/**
 * Python project that uses uv for dependency management and environment management.
 *
 * This extends PythonProject but configures it to work with uv instead of
 * poetry, pip, or other traditional Python package managers.
 */
export class UvPythonProject extends PythonProject {
  private readonly uvOptions: UvPythonProjectOptions;

  constructor(options: UvPythonProjectOptions) {
    // Pass venv: true and pip: true to satisfy validation
    super({
      ...options,
      venv: true,
      poetry: false,
      pip: true,
    });

    this.uvOptions = options;

    // Override the pip component to prevent installation
    const pipComponent = this.components.find(
      (c: Component) => c.constructor.name === "Pip"
    );
    if (pipComponent) {
      // Replace the installDependencies method to do nothing
      (pipComponent as any).installDependencies = () => {
        this.logger.info(
          "Skipping pip install - using uv for dependency management"
        );
      };
    }

    // Create our own pyproject.toml file since we're not using pip's version
    this.createPyprojectToml();

    // Override install tasks to use uv
    this.setupUvTasks();
  }

  private setupUvTasks(): void {
    // Remove the default pip install task
    this.tasks.tryFind("install")?.reset();

    // Create new install task with uv sync
    const installTask = this.tasks.tryFind("install");
    if (installTask) {
      installTask.reset("uv sync");
    }

    // Ensure install runs before pre-compile
    const preCompileTask = this.tasks.tryFind("pre-compile");
    if (preCompileTask) {
      preCompileTask.prependSpawn(
        installTask ||
          this.addTask("install", {
            exec: "uv sync",
            description: "Install dependencies using uv",
          })
      );
    }
  }

  private createPyprojectToml(): void {
    const deps = this.deps.all
      .filter((d) => d.type === "runtime" && d.name !== "python")
      .map((d) => (d.version ? `${d.name}==${d.version}` : d.name));

    const devDeps = this.deps.all
      .filter((d) => ["build", "test"].includes(d.type) && d.name !== "python")
      .map((d) => (d.version ? `${d.name}==${d.version}` : d.name));

    const pythonVersion = this.uvOptions.pythonExec || "python3.10";
    const majorVersion = pythonVersion.split(".")[1] || "10";

    new TomlFile(this, "pyproject.toml", {
      obj: {
        project: {
          name: this.name,
          version: this.version || "0.1.0",
          description: this.uvOptions.description || "",
          readme: "README.md",
          "requires-python": `>=3.${majorVersion}`,
          dependencies: deps,
          scripts: this.uvOptions.scripts,
        },
        "dependency-groups": devDeps.length > 0 ? { dev: devDeps } : undefined,
        tool: {
          uv: {
            managed: this.uvOptions.uvManaged ?? true,
            package: true,
          },
        },
      },
      omitEmpty: true,
    });
  }

  preSynthesize(): void {
    super.preSynthesize();
  }

  postSynthesize(): void {
    // Call super to write files, but pip install is disabled via component override
    super.postSynthesize();

    // Remove files that are not needed with uv
    const filesToRemove = [
      ".venv",
      "requirements.txt",
      "requirements-dev.txt",
      "setup.py",
      "setup.cfg",
    ];

    for (const file of filesToRemove) {
      this.tryRemoveFile(file);
    }
  }
}
