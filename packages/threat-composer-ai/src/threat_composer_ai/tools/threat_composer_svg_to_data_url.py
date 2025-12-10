"""
Util for creating data URLs from SVG diagrams.

This tool takes an SVG diagram as a string and returns a properly formatted data URL
with base64 encoding for use in web applications and documents.
"""

import base64


def threat_composer_svg_to_data_url(svg_string: str) -> str:
    """
    Create a data URL from an SVG diagram string.

    This tool takes an SVG diagram as a string input and converts it to a properly
    formatted data URL with base64 encoding. The resulting data URL can be used
    directly in HTML img tags, CSS background-image properties, or anywhere a
    URL is expected for displaying the SVG image.

    The output format follows the standard: data:image/svg+xml;base64,[base64_encoded_svg]

    Use this tool when you need to:
    - Convert SVG diagrams to embeddable data URLs
    - Create inline images for web applications
    - Generate base64-encoded SVG data for documents
    - Prepare SVG content for email or PDF generation
    - Create self-contained HTML with embedded images

    Args:
        svg_string (str): The SVG diagram content as a string. Should be valid SVG markup
                         starting with <svg> and ending with </svg>.

    Returns:
        str: A properly formatted data URL string in the format:
             data:image/svg+xml;base64,[base64_encoded_svg_content]

    Example:
        >>> svg = '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="red"/></svg>'
        >>> threat_composer_svg_to_data_url(svg)
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIGZpbGw9InJlZCIvPjwvc3ZnPg=="
    """
    try:
        # Validate input
        if not isinstance(svg_string, str):
            return f"❌ Error: svg_string must be a string, got {type(svg_string).__name__}"

        if not svg_string.strip():
            return "❌ Error: svg_string cannot be empty"

        # Basic SVG validation - check if it looks like SVG content
        svg_lower = svg_string.strip().lower()
        if not (svg_lower.startswith("<svg") and svg_lower.endswith("</svg>")):
            return "❌ Error: svg_string must be valid SVG markup starting with <svg> and ending with </svg>"

        # Encode the SVG string to bytes using UTF-8
        svg_bytes = svg_string.encode("utf-8")

        # Base64 encode the bytes
        base64_encoded = base64.b64encode(svg_bytes).decode("ascii")

        # Create the data URL
        data_url = f"data:image/svg+xml;base64,{base64_encoded}"

        return data_url

    except Exception as e:
        return f"❌ Error creating data URL: {str(e)}"
