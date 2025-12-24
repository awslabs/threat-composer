"""
Security scanner for diagram code execution.

Validates Python code before execution to prevent security vulnerabilities.
Based on patterns from aws-diagram-mcp-server.
"""

import ast
import os
import tempfile
from dataclasses import dataclass, field


@dataclass
class SecurityIssue:
    """Model for security issues found in code."""

    severity: str
    line: int
    issue_text: str
    issue_type: str


@dataclass
class CodeScanResult:
    """Model for code scan result."""

    is_safe: bool
    syntax_valid: bool
    security_issues: list[SecurityIssue] = field(default_factory=list)
    error_message: str | None = None


# Dangerous functions that should never be in diagram code
DANGEROUS_PATTERNS = [
    ("exec(", "Arbitrary code execution"),
    ("eval(", "Arbitrary code evaluation"),
    ("subprocess.", "Subprocess execution"),
    ("os.system", "System command execution"),
    ("os.popen", "Process execution"),
    ("__import__", "Dynamic import"),
    ("pickle.loads", "Unsafe deserialization"),
    ("pickle.load", "Unsafe deserialization"),
    ("spawn(", "Process spawning"),
    ("compile(", "Code compilation"),
    ("open(", "File operations not allowed"),
    ("globals(", "Global namespace access"),
    ("locals(", "Local namespace access"),
    ("getattr(", "Dynamic attribute access"),
    ("setattr(", "Dynamic attribute modification"),
    ("delattr(", "Dynamic attribute deletion"),
]


def validate_syntax_and_imports(code: str) -> tuple[bool, str | None]:
    """
    Validate Python code syntax and block import statements.

    Args:
        code: Python code to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        tree = ast.parse(code)

        # Check for import statements - these are not allowed
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                return False, f"Import statements not allowed (line {node.lineno})"
            elif isinstance(node, ast.ImportFrom):
                return False, f"Import statements not allowed (line {node.lineno})"

        return True, None

    except SyntaxError as e:
        return False, f"Syntax error at line {e.lineno}: {e.msg}"
    except Exception as e:
        return False, f"Parse error: {str(e)}"


def check_dangerous_functions(code: str) -> list[SecurityIssue]:
    """
    Check for dangerous functions in code.

    Args:
        code: Python code to check

    Returns:
        List of security issues found
    """
    issues = []
    lines = code.splitlines()

    for i, line in enumerate(lines, 1):
        # Skip comments
        stripped = line.strip()
        if stripped.startswith("#"):
            continue

        for pattern, description in DANGEROUS_PATTERNS:
            if pattern in line:
                issues.append(
                    SecurityIssue(
                        severity="HIGH",
                        line=i,
                        issue_text=f"Dangerous function '{pattern.rstrip('(')}' detected: {description}",
                        issue_type="DangerousFunctionDetection",
                    )
                )

    return issues


def check_with_bandit(code: str) -> list[SecurityIssue]:
    """
    Scan code for security issues using bandit.

    Args:
        code: Python code to scan

    Returns:
        List of security issues found by bandit
    """
    from bandit.core import config, manager

    issues = []
    temp_file_path = None

    try:
        # Create a temporary file for the code
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".py", delete=False
        ) as code_file:
            temp_file_path = code_file.name
            code_file.write(code)
            code_file.flush()

        # Create bandit config and manager
        b_conf = config.BanditConfig()
        mgr = manager.BanditManager(
            b_conf, "file", debug=False, verbose=False, quiet=True
        )

        # Run the scan
        mgr.discover_files([temp_file_path])
        mgr.run_tests()

        # Process results
        for issue in mgr.get_issue_list():
            issues.append(
                SecurityIssue(
                    severity=issue.severity,
                    line=issue.lineno,
                    issue_text=issue.text,
                    issue_type=issue.test_id,
                )
            )

    except Exception as e:
        # If bandit fails, add an error issue but don't block execution
        issues.append(
            SecurityIssue(
                severity="ERROR",
                line=0,
                issue_text=f"Bandit scan error: {str(e)}",
                issue_type="ScanError",
            )
        )
    finally:
        # Clean up the temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except Exception:
                pass

    return issues


def scan_diagram_code(code: str) -> CodeScanResult:
    """
    Scan diagram code for security issues before execution.

    This performs:
    1. Syntax validation
    2. Import statement blocking
    3. Dangerous function detection (pattern-based)
    4. Bandit security scanning

    Args:
        code: Python code to scan

    Returns:
        CodeScanResult with validation status and any issues found
    """
    # Check syntax and imports
    syntax_valid, syntax_error = validate_syntax_and_imports(code)
    if not syntax_valid:
        return CodeScanResult(
            is_safe=False,
            syntax_valid=False,
            error_message=syntax_error,
        )

    # Collect all security issues
    security_issues: list[SecurityIssue] = []

    # Check for dangerous functions (fast pattern-based check)
    security_issues.extend(check_dangerous_functions(code))

    # Run bandit for deeper analysis
    bandit_issues = check_with_bandit(code)
    # Filter out scan errors from blocking - they're informational
    blocking_bandit_issues = [i for i in bandit_issues if i.issue_type != "ScanError"]
    security_issues.extend(blocking_bandit_issues)

    if security_issues:
        messages = [
            f"{issue.issue_type}: {issue.issue_text}" for issue in security_issues
        ]
        return CodeScanResult(
            is_safe=False,
            syntax_valid=True,
            security_issues=security_issues,
            error_message="\n".join(messages),
        )

    return CodeScanResult(
        is_safe=True,
        syntax_valid=True,
    )
