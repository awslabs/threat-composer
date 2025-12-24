"""Tests for the code scanner security validation."""

from threat_composer_ai.validation.code_scanner import (
    check_dangerous_functions,
    check_with_bandit,
    scan_diagram_code,
    validate_syntax_and_imports,
)


class TestValidateSyntaxAndImports:
    """Tests for syntax and import validation."""

    def test_valid_code_passes(self):
        """Valid Python code should pass validation."""
        code = """
with Diagram('Test'):
    EC2('server') >> RDS('db')
"""
        is_valid, error = validate_syntax_and_imports(code)
        assert is_valid is True
        assert error is None

    def test_syntax_error_fails(self):
        """Code with syntax errors should fail."""
        code = """
def broken(
    print("missing paren"
"""
        is_valid, error = validate_syntax_and_imports(code)
        assert is_valid is False
        assert "Syntax error" in error

    def test_import_statement_blocked(self):
        """Import statements should be blocked."""
        code = """
import os
with Diagram('Test'):
    EC2('server')
"""
        is_valid, error = validate_syntax_and_imports(code)
        assert is_valid is False
        assert "Import statements not allowed" in error

    def test_from_import_blocked(self):
        """From import statements should be blocked."""
        code = """
from os import system
with Diagram('Test'):
    EC2('server')
"""
        is_valid, error = validate_syntax_and_imports(code)
        assert is_valid is False
        assert "Import statements not allowed" in error


class TestCheckDangerousFunctions:
    """Tests for dangerous function detection."""

    def test_exec_detected(self):
        """exec() should be detected."""
        code = "exec('print(1)')"
        issues = check_dangerous_functions(code)
        assert len(issues) == 1
        assert issues[0].issue_type == "DangerousFunctionDetection"
        assert "exec" in issues[0].issue_text

    def test_eval_detected(self):
        """eval() should be detected."""
        code = "result = eval('1 + 1')"
        issues = check_dangerous_functions(code)
        assert len(issues) == 1
        assert "eval" in issues[0].issue_text

    def test_subprocess_detected(self):
        """subprocess usage should be detected."""
        code = "subprocess.run(['ls'])"
        issues = check_dangerous_functions(code)
        assert len(issues) == 1
        assert "subprocess" in issues[0].issue_text

    def test_os_system_detected(self):
        """os.system should be detected."""
        code = "os.system('rm -rf /')"
        issues = check_dangerous_functions(code)
        assert len(issues) == 1
        assert "os.system" in issues[0].issue_text

    def test_open_detected(self):
        """open() should be detected."""
        code = "f = open('/etc/passwd', 'r')"
        issues = check_dangerous_functions(code)
        assert len(issues) == 1
        assert "open" in issues[0].issue_text

    def test_pickle_loads_detected(self):
        """pickle.loads should be detected."""
        code = "data = pickle.loads(untrusted_data)"
        issues = check_dangerous_functions(code)
        # Both pickle.load and pickle.loads patterns match
        assert len(issues) >= 1
        assert any("pickle" in i.issue_text for i in issues)

    def test_dunder_import_detected(self):
        """__import__ should be detected."""
        code = "mod = __import__('os')"
        issues = check_dangerous_functions(code)
        assert len(issues) == 1
        assert "__import__" in issues[0].issue_text

    def test_comments_ignored(self):
        """Comments should be ignored."""
        code = "# exec('this is a comment')"
        issues = check_dangerous_functions(code)
        assert len(issues) == 0

    def test_safe_code_passes(self):
        """Safe diagram code should pass."""
        code = """
with Diagram('Test'):
    server = EC2('server')
    db = RDS('database')
    server >> db
"""
        issues = check_dangerous_functions(code)
        assert len(issues) == 0

    def test_multiple_issues_detected(self):
        """Multiple dangerous functions should all be detected."""
        code = """
exec('code')
eval('more code')
os.system('command')
"""
        issues = check_dangerous_functions(code)
        assert len(issues) == 3


class TestCheckWithBandit:
    """Tests for bandit security scanning."""

    def test_exec_detected_by_bandit(self):
        """Bandit should detect exec usage."""
        code = "exec('print(1)')"
        issues = check_with_bandit(code)
        # Bandit should find B102 (exec)
        assert any(i.issue_type == "B102" for i in issues)

    def test_safe_code_passes_bandit(self):
        """Safe code should pass bandit scan."""
        code = """
x = 1 + 1
print(x)
"""
        issues = check_with_bandit(code)
        # Filter out scan errors
        blocking_issues = [i for i in issues if i.issue_type != "ScanError"]
        assert len(blocking_issues) == 0


class TestScanDiagramCode:
    """Integration tests for the full scan_diagram_code function."""

    def test_safe_diagram_code_passes(self):
        """Safe diagram code should pass all checks."""
        code = """
with Diagram('Test Architecture'):
    server = EC2('web server')
    database = RDS('database')
    server >> database
"""
        result = scan_diagram_code(code)
        assert result.is_safe is True
        assert result.syntax_valid is True
        assert len(result.security_issues) == 0
        assert result.error_message is None

    def test_import_blocked(self):
        """Import statements should block execution."""
        code = """
import os
with Diagram('Test'):
    EC2('server')
"""
        result = scan_diagram_code(code)
        assert result.is_safe is False
        assert result.syntax_valid is False
        assert "Import statements not allowed" in result.error_message

    def test_exec_blocked(self):
        """exec() should block execution."""
        code = """
exec('malicious code')
with Diagram('Test'):
    EC2('server')
"""
        result = scan_diagram_code(code)
        assert result.is_safe is False
        assert result.syntax_valid is True
        assert len(result.security_issues) > 0
        # Should have both pattern detection and bandit detection
        issue_types = [i.issue_type for i in result.security_issues]
        assert "DangerousFunctionDetection" in issue_types
        assert "B102" in issue_types

    def test_eval_blocked(self):
        """eval() should block execution."""
        code = "result = eval(user_input)"
        result = scan_diagram_code(code)
        assert result.is_safe is False
        assert "eval" in result.error_message.lower()

    def test_syntax_error_blocked(self):
        """Syntax errors should block execution."""
        code = "def broken("
        result = scan_diagram_code(code)
        assert result.is_safe is False
        assert result.syntax_valid is False
        assert "Syntax error" in result.error_message

    def test_complex_safe_diagram(self):
        """Complex but safe diagram code should pass."""
        code = """
with Diagram('Complex Architecture', direction='LR'):
    with Cluster('Web Tier'):
        web1 = EC2('web1')
        web2 = EC2('web2')

    with Cluster('Database Tier'):
        primary = RDS('primary')
        replica = RDS('replica')

    lb = ELB('load balancer')
    lb >> [web1, web2]
    web1 >> primary
    web2 >> primary
    primary - replica
"""
        result = scan_diagram_code(code)
        assert result.is_safe is True

    def test_os_popen_blocked(self):
        """os.popen should be blocked."""
        code = "output = os.popen('ls').read()"
        result = scan_diagram_code(code)
        assert result.is_safe is False
        assert "os.popen" in result.error_message

    def test_subprocess_blocked(self):
        """subprocess should be blocked."""
        code = "subprocess.call(['rm', '-rf', '/'])"
        result = scan_diagram_code(code)
        assert result.is_safe is False
        assert "subprocess" in result.error_message

    def test_globals_blocked(self):
        """globals() should be blocked."""
        code = "g = globals()"
        result = scan_diagram_code(code)
        assert result.is_safe is False
        assert "globals" in result.error_message

    def test_compile_blocked(self):
        """compile() should be blocked."""
        code = "code_obj = compile('print(1)', '<string>', 'exec')"
        result = scan_diagram_code(code)
        assert result.is_safe is False
        assert "compile" in result.error_message
