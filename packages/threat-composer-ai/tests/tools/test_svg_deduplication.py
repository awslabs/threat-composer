"""
Tests for SVG image deduplication in diagram generation.

Validates that deduplicate_embedded_images correctly deduplicates
base64-embedded PNG images in SVG content using <defs>/<use> references.
"""

from threat_composer_ai.tools.threat_composer_dia_common import (
    deduplicate_embedded_images,
)

# Minimal valid SVG wrapper
SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">'
SVG_CLOSE = "</svg>"


def make_image(x: str, y: str, data: str, w: str = "100", h: str = "100") -> str:
    """Helper to create an SVG <image> element with base64 data."""
    return (
        f'<image x="{x}" y="{y}" width="{w}" height="{h}" '
        f'xlink:href="data:image/png;base64,{data}"/>'
    )


def make_svg(*elements: str) -> str:
    """Helper to wrap elements in a valid SVG document."""
    return SVG_OPEN + "\n".join(elements) + SVG_CLOSE


class TestDeduplicateEmbeddedImages:
    """Tests for the deduplicate_embedded_images function."""

    def test_no_images_returns_unchanged(self):
        """SVG with no images passes through unchanged."""
        svg = make_svg('<rect x="0" y="0" width="100" height="100"/>')
        assert deduplicate_embedded_images(svg) == svg

    def test_single_image_returns_unchanged(self):
        """A single image has nothing to deduplicate."""
        img = make_image("10", "20", "AAAA")
        svg = make_svg(img)
        result = deduplicate_embedded_images(svg)
        # Single image — no dedup needed, should be unchanged
        assert result == svg

    def test_unique_images_returns_unchanged(self):
        """Multiple images with different data should not be deduplicated."""
        img1 = make_image("10", "20", "AAAA")
        img2 = make_image("30", "40", "BBBB")
        img3 = make_image("50", "60", "CCCC")
        svg = make_svg(img1, img2, img3)
        result = deduplicate_embedded_images(svg)
        assert result == svg

    def test_duplicate_images_are_deduplicated(self):
        """Two identical images should produce one <defs> entry and two <use> refs."""
        img1 = make_image("10", "20", "AAAA")
        img2 = make_image("30", "40", "AAAA")
        svg = make_svg(img1, img2)
        result = deduplicate_embedded_images(svg)

        # Should contain a <defs> block
        assert "<defs>" in result
        assert "</defs>" in result

        # Should contain <use> references
        assert "<use " in result
        assert 'xlink:href="#dedup-img-' in result

        # Original data URI should appear exactly once (in the defs)
        assert result.count("data:image/png;base64,AAAA") == 1

        # Both positions should be preserved
        assert 'x="10"' in result
        assert 'y="20"' in result
        assert 'x="30"' in result
        assert 'y="40"' in result

    def test_mixed_duplicate_and_unique(self):
        """Mix of duplicated and unique images — only duplicates get deduped."""
        dup1 = make_image("10", "20", "AAAA")
        dup2 = make_image("30", "40", "AAAA")
        unique = make_image("50", "60", "BBBB")
        svg = make_svg(dup1, unique, dup2)
        result = deduplicate_embedded_images(svg)

        # Duplicated image in defs once
        assert result.count("data:image/png;base64,AAAA") == 1
        # Unique image stays inline
        assert result.count("data:image/png;base64,BBBB") == 1
        # Use refs for the duplicated pair
        assert result.count("<use ") == 2

    def test_preserves_svg_structure(self):
        """Output is still valid SVG — starts with <svg> and ends with </svg>."""
        img1 = make_image("10", "20", "AAAA")
        img2 = make_image("30", "40", "AAAA")
        svg = make_svg(img1, img2)
        result = deduplicate_embedded_images(svg)

        assert result.strip().startswith("<svg")
        assert result.strip().endswith("</svg>")

    def test_preserves_width_height_per_instance(self):
        """Each <use> should preserve its own width/height."""
        img1 = make_image("10", "20", "AAAA", w="50", h="50")
        img2 = make_image("30", "40", "AAAA", w="200", h="200")
        svg = make_svg(img1, img2)
        result = deduplicate_embedded_images(svg)

        assert 'width="50"' in result
        assert 'height="50"' in result
        assert 'width="200"' in result
        assert 'height="200"' in result

    def test_three_duplicates_one_def(self):
        """Three copies of the same image should produce one def and three uses."""
        imgs = [make_image(str(i * 10), str(i * 10), "XXXX") for i in range(3)]
        svg = make_svg(*imgs)
        result = deduplicate_embedded_images(svg)

        assert result.count("data:image/png;base64,XXXX") == 1
        assert result.count("<use ") == 3

    def test_multiple_duplicate_groups(self):
        """Two groups of duplicates should each get their own def."""
        a1 = make_image("10", "10", "AAAA")
        a2 = make_image("20", "20", "AAAA")
        b1 = make_image("30", "30", "BBBB")
        b2 = make_image("40", "40", "BBBB")
        svg = make_svg(a1, a2, b1, b2)
        result = deduplicate_embedded_images(svg)

        assert result.count("data:image/png;base64,AAAA") == 1
        assert result.count("data:image/png;base64,BBBB") == 1
        assert result.count("<use ") == 4
        assert "dedup-img-0" in result
        assert "dedup-img-1" in result

    def test_empty_svg(self):
        """Empty SVG content returns unchanged."""
        result = deduplicate_embedded_images("")
        assert result == ""

    def test_preserves_transform_attribute(self):
        """Transform attributes on images should be preserved in <use> elements."""
        img = (
            '<image x="10" y="20" width="100" height="100" '
            'transform="rotate(45)" '
            'xlink:href="data:image/png;base64,AAAA"/>'
        )
        svg = make_svg(img, img)
        result = deduplicate_embedded_images(svg)

        assert 'transform="rotate(45)"' in result

    def test_real_world_size_reduction(self):
        """Simulates a real diagram with repeated large base64 icons."""
        # Simulate 15 nodes using 5 unique icons (3 copies each)
        icons = [chr(65 + i) * 20000 for i in range(5)]
        images = []
        for i, icon in enumerate(icons):
            for j in range(3):
                images.append(make_image(str(i * 100 + j * 10), str(j * 50), icon))

        svg = make_svg(*images)
        result = deduplicate_embedded_images(svg)

        # Should be significantly smaller
        assert len(result) < len(svg)
        # Each icon data appears once (in defs)
        for icon in icons:
            assert result.count(f"data:image/png;base64,{icon}") == 1
        # 15 <use> elements
        assert result.count("<use ") == 15
