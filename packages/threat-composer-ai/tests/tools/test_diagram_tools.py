"""Tests for the diagram tools, which draw from structured data."""

import ast
import base64
import json
import os
import shutil
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest

import threat_composer_ai
from threat_composer_ai.config import AppConfig, register_global_config
from threat_composer_ai.tools.threat_composer_dia_architecture import (
    TOOL_SPEC as ARCH_SPEC,
)
from threat_composer_ai.tools.threat_composer_dia_architecture import (
    ArchitectureSpec,
    get_icon_index,
    icon_tree,
    resolve_icon,
    threat_composer_dia_architecture,
)
from threat_composer_ai.tools.threat_composer_dia_common import (
    MAX_GROUP_DEPTH,
    MAX_NODES,
    parse_spec,
    tool_input_schema,
)
from threat_composer_ai.tools.threat_composer_dia_dfd import TOOL_SPEC as DFD_SPEC
from threat_composer_ai.tools.threat_composer_dia_dfd import (
    DfdSpec,
    threat_composer_dia_dfd,
)
from threat_composer_ai.tools.threat_composer_dia_list_icons import (
    threat_composer_dia_list_icons,
)

needs_graphviz = pytest.mark.skipif(
    shutil.which("dot") is None, reason="graphviz is not installed"
)

# A 1x1 PNG. Labels that name it must stay text, not become an image.
PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)
PNG_B64 = base64.b64encode(PNG_BYTES).decode()


@pytest.fixture
def env():
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        working_dir = temp_path / "working_dir"
        working_dir.mkdir()
        config = AppConfig.create(
            working_directory=working_dir,
            output_directory=working_dir / ".threat-composer",
        )
        register_global_config(config)
        png = temp_path / "picture.png"
        png.write_bytes(PNG_BYTES)
        components = config.output_directory / config.components_output_sub_dir
        yield {
            "dfd": components / config.dataflow_diagram_filename,
            "arch": components / config.architecture_diagram_filename,
            "png": png,
        }


def _dfd_input(label: str = "API") -> dict:
    return {
        "title": "Test DFD",
        "trust_boundaries": [{"id": "b1", "label": "Internal"}],
        "elements": [
            {"id": "p1", "type": "process", "label": label, "trust_boundary": "b1"},
            {"id": "p2", "type": "process", "label": "Worker"},
        ],
        "flows": [{"id": "DF1", "source": "p1", "target": "p2", "label": "Job"}],
    }


def _arch_input(label: str = "Web") -> dict:
    return {
        "title": "Test Architecture",
        "clusters": [{"id": "vpc", "label": "VPC"}],
        "nodes": [
            {"id": "web", "icon": "aws.compute.EC2", "label": label, "cluster": "vpc"},
            {"id": "db", "icon": "aws.database.RDS", "label": "DB"},
        ],
        "edges": [{"source": "web", "target": "db", "label": "SQL"}],
    }


def _call(tool_fn, tool_input: dict) -> dict:
    return tool_fn({"toolUseId": "t1", "input": tool_input})


def _text(result: dict) -> str:
    return result["content"][0]["text"]


class TestToolsTakeData:
    def test_package_has_no_dynamic_code_calls(self):
        root = Path(threat_composer_ai.__file__).parent
        banned = {"exec", "eval", "compile", "__import__"}
        found = []
        for path in root.rglob("*.py"):
            for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
                if (
                    isinstance(node, ast.Call)
                    and isinstance(node.func, ast.Name)
                    and node.func.id in banned
                ):
                    found.append(f"{path.relative_to(root)}:{node.lineno}")
        assert found == []

    @pytest.mark.parametrize("spec", [DFD_SPEC, ARCH_SPEC])
    def test_tool_specs_take_no_code(self, spec):
        assert "code" not in spec["inputSchema"]["properties"]
        assert spec["inputSchema"]["additionalProperties"] is False

    @pytest.mark.parametrize("spec", [DFD_SPEC, ARCH_SPEC])
    def test_tool_schema_is_generated_and_self_contained(self, spec):
        schema = spec["inputSchema"]
        assert schema["type"] == "object"
        assert "$ref" not in json.dumps(schema)
        assert "$defs" not in schema

    def test_tool_schemas_match_the_models(self):
        assert DFD_SPEC["inputSchema"] == tool_input_schema(DfdSpec)
        assert ARCH_SPEC["inputSchema"] == tool_input_schema(ArchitectureSpec)

    def test_architecture_schema_uses_nodes_alias(self):
        properties = ARCH_SPEC["inputSchema"]["properties"]
        assert "nodes" in properties and "nodes_" not in properties
        assert "nodes" in ARCH_SPEC["inputSchema"]["required"]

    def test_dfd_schema_requires_flow_id(self):
        flow = DFD_SPEC["inputSchema"]["properties"]["flows"]["items"]
        assert "id" in flow["required"]
        assert flow["properties"]["id"]["pattern"] == "^DF[0-9]{1,4}$"

    @pytest.mark.parametrize(
        "tool_fn,key",
        [(threat_composer_dia_dfd, "dfd"), (threat_composer_dia_architecture, "arch")],
    )
    def test_code_input_is_rejected(self, env, tool_fn, key):
        result = _call(tool_fn, {"code": 'with Diagram("x"):\n    pass'})
        assert result["status"] == "error"
        assert not env[key].exists()


@needs_graphviz
class TestLabelsAreText:
    def _html_label(self, png: Path) -> str:
        return f'<<TABLE><TR><TD><IMG SRC="{png}"/></TD></TR></TABLE>>'

    def test_html_like_label_is_text(self, env):
        result = _call(
            threat_composer_dia_dfd, _dfd_input(self._html_label(env["png"]))
        )
        assert result["status"] == "success"
        svg = env["dfd"].read_text(encoding="utf-8")
        assert "<image" not in svg
        assert "&lt;IMG" in svg

    @pytest.mark.parametrize(
        "template",
        ['x" image="{png}" y="', 'x\\" image="{png}" y="', 'x\\\\" image="{png}" y="'],
    )
    def test_quotes_in_labels_are_text(self, env, template):
        label = template.format(png=env["png"])
        result = _call(threat_composer_dia_dfd, _dfd_input(label))
        assert result["status"] == "success"
        assert "<image" not in env["dfd"].read_text(encoding="utf-8")

    def test_trailing_backslash_label_renders(self, env):
        result = _call(threat_composer_dia_dfd, _dfd_input("path\\"))
        assert result["status"] == "success"

    @pytest.mark.parametrize("field", ["title", "cluster"])
    def test_architecture_title_and_cluster_labels_are_text(self, env, field):
        data = _arch_input()
        label = self._html_label(env["png"])
        if field == "title":
            data["title"] = label
        else:
            data["clusters"][0]["label"] = label
        result = _call(threat_composer_dia_architecture, data)
        assert result["status"] == "success"
        svg = env["arch"].read_text(encoding="utf-8")
        assert "&lt;IMG" in svg
        # The node icons are embedded, but not the PNG the label names.
        assert PNG_B64 not in svg


class TestIconAllowlist:
    @pytest.mark.parametrize(
        "icon",
        [
            "custom.Custom",
            "diagrams.custom.Custom",
            "Custom",
            "os.getcwd",
            "diagrams.os",
            "aws.compute.__class__",
            "aws.compute.EC2.__init__",
            "../../../etc/passwd",
            "Node",
        ],
    )
    def test_names_outside_the_allowlist_are_rejected(self, icon):
        with pytest.raises(ValueError):
            resolve_icon(icon)

    def test_icon_names_resolve(self):
        ec2 = resolve_icon("aws.compute.EC2")
        assert resolve_icon("diagrams.aws.compute.EC2") is ec2

    def test_no_custom_icons_in_allowlist(self):
        assert not any(k.startswith("custom.") for k in get_icon_index())

    def test_every_listed_aws_icon_is_accepted(self):
        services = icon_tree()["aws"]
        assert services
        for service, icons in services.items():
            for icon in icons:
                resolve_icon(f"aws.{service}.{icon}")

    def test_unknown_icon_suggests_close_matches(self):
        data = _arch_input()
        data["nodes"][0]["icon"] = "aws.compute.Lamda"
        with pytest.raises(ValueError) as e:
            parse_spec(data, ArchitectureSpec)
        assert "aws.compute.Lambda" in str(e.value)

    def test_unknown_icon_fails_validation(self):
        data = _arch_input()
        data["nodes"][0]["icon"] = "custom.Custom"
        with pytest.raises(ValueError, match="unknown icon"):
            parse_spec(data, ArchitectureSpec)


class TestInputValidation:
    def test_valid_inputs_parse(self):
        parse_spec(_dfd_input(), DfdSpec)
        parse_spec(_arch_input(), ArchitectureSpec)

    def test_json_string_fields_are_accepted(self):
        data = _dfd_input()
        data["elements"] = json.dumps(data["elements"])
        parse_spec(data, DfdSpec)

    @pytest.mark.parametrize(
        "mutate,match",
        [
            (lambda d: d.update(code="x"), "Extra inputs"),
            (lambda d: d["elements"][0].update(shape="box"), "Extra inputs"),
            (lambda d: d["elements"][0].update(type="custom"), "type"),
            (lambda d: d["elements"][0].update(id="bad id!"), "pattern"),
            (lambda d: d["elements"][1].update(id="p1"), "duplicate id"),
            (lambda d: d["flows"][0].update(target="nope"), "unknown node"),
            (lambda d: d["flows"][0].pop("id"), "flows.0.id"),
            (lambda d: d["flows"][0].update(id="Flow1"), "pattern"),
            (lambda d: d["flows"].append(dict(d["flows"][0])), "duplicate flow id"),
            (lambda d: d["elements"][0].update(trust_boundary="nope"), "unknown group"),
            (lambda d: d["trust_boundaries"][0].update(parent="b1"), "cycle"),
            (lambda d: d["elements"][0].update(label="x" * 201), "at most 200"),
        ],
    )
    def test_invalid_dfd_input_is_rejected(self, mutate, match):
        data = _dfd_input()
        mutate(data)
        with pytest.raises(ValueError, match=match):
            parse_spec(data, DfdSpec)

    def test_too_many_nodes_is_rejected(self):
        data = _dfd_input()
        data["elements"] = [
            {"id": f"p{i}", "type": "process", "label": "x"}
            for i in range(MAX_NODES + 1)
        ]
        data["flows"] = []
        with pytest.raises(ValueError, match="at most"):
            parse_spec(data, DfdSpec)

    def test_deep_nesting_is_rejected(self):
        data = _dfd_input()
        data["trust_boundaries"] = [
            {"id": f"b{i}", "label": "x", "parent": f"b{i - 1}" if i else None}
            for i in range(MAX_GROUP_DEPTH + 1)
        ]
        with pytest.raises(ValueError, match="nested deeper"):
            parse_spec(data, DfdSpec)


@needs_graphviz
class TestRendering:
    def test_dfd_renders(self, env):
        result = _call(threat_composer_dia_dfd, _dfd_input())
        assert result["status"] == "success"
        svg = env["dfd"].read_text(encoding="utf-8")
        assert "DF1: Job" in svg and "Internal" in svg

    def test_dfd_flow_label_with_id_prefix_is_not_doubled(self, env):
        data = _dfd_input()
        data["flows"][0]["label"] = "DF1: Job"
        result = _call(threat_composer_dia_dfd, data)
        assert result["status"] == "success"
        svg = env["dfd"].read_text(encoding="utf-8")
        assert "DF1: Job" in svg and "DF1: DF1" not in svg

    def test_architecture_renders_with_icons(self, env):
        result = _call(threat_composer_dia_architecture, _arch_input())
        assert result["status"] == "success"
        assert "data:image/png;base64," in env["arch"].read_text(encoding="utf-8")

    def test_tool_works_from_a_worker_thread(self, env):
        # The MCP server runs the workflow off the main thread.
        with ThreadPoolExecutor(max_workers=1) as pool:
            result = pool.submit(_call, threat_composer_dia_dfd, _dfd_input()).result()
        assert result["status"] == "success"


class TestListIcons:
    def test_lists_providers(self):
        text = _text(_call(threat_composer_dia_list_icons, {}))
        assert text.startswith("Available providers: ")
        assert "aws" in text and "custom" not in text

    def test_lists_service_icons(self):
        text = _text(
            _call(
                threat_composer_dia_list_icons,
                {"provider_filter": "aws", "service_filter": "compute"},
            )
        )
        assert "## aws" in text and "### compute" in text
        assert 'Use as icon: "aws.compute.' in text

    @pytest.mark.parametrize("provider", ["custom", "__pycache__", "nope"])
    def test_unknown_or_excluded_provider_is_not_found(self, provider):
        text = _text(
            _call(threat_composer_dia_list_icons, {"provider_filter": provider})
        )
        assert text == "Error: Provider not found"

    def test_unknown_service_is_not_found(self):
        text = _text(
            _call(
                threat_composer_dia_list_icons,
                {"provider_filter": "aws", "service_filter": "nope"},
            )
        )
        assert text == "Error: Service not found"

    @pytest.mark.parametrize("provider", ["../..", "/etc", "aws/../../.."])
    def test_ai_file_access_list_icons_ignores_paths(self, provider, monkeypatch):
        def no_fs(*args, **kwargs):
            raise AssertionError("list_icons touched the file system")

        get_icon_index()  # built from the installed package before patching
        monkeypatch.setattr(os.path, "isdir", no_fs)
        monkeypatch.setattr(os.path, "isfile", no_fs)
        monkeypatch.setattr(os, "listdir", no_fs)
        for service in (None, "passwd"):
            tool_input = {"provider_filter": provider}
            if service:
                tool_input["service_filter"] = service
            result = _call(threat_composer_dia_list_icons, tool_input)
            assert result["status"] == "success"
            assert "not found" in _text(result).lower()
