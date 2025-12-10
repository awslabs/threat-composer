"""
Strands tool for generating UUID4 GUIDs.

This tool generates a random UUID4 GUID in standard format with hyphens.
"""

import uuid

from strands import tool

from threat_composer_ai.utils.tool_helpers import get_tool_name


@tool(
    name="threat_composer_generate_uuid4",
    description="Generates one or more random UUID4 GUID strings in standard format (36 characters with hyphens)",
)
def threat_composer_generate_uuid4(batch_size: int = 1) -> list[str]:
    """
    Generate one or more random UUID4 GUID strings.

    This tool generates universally unique identifiers (UUIDs) using the UUID4 algorithm,
    which creates random 128-bit identifiers. The output is always in standard format
    with hyphens, exactly 36 characters long per GUID.

    The tool can generate a single GUID or a batch of GUIDs based on the batch_size parameter.
    UUID4 uses random or pseudo-random numbers, making collisions extremely unlikely.

    Use this tool when you need:
    - Unique identifiers for records, sessions, or objects
    - Random IDs that are guaranteed to be unique across systems
    - Standard-format GUIDs for database keys or API responses
    - Traceable identifiers for logging or debugging
    - Multiple unique identifiers at once for batch operations

    Args:
        batch_size (int, optional): Number of GUIDs to generate. Defaults to 1.
                                   Must be a positive integer.

    Returns:
        A list of strings, each containing a UUID4 GUID in standard format with hyphens.
        Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        Length: Always exactly 36 characters per GUID

    Example:
        >>> threat_composer_generate_uuid4()
        ["550e8400-e29b-41d4-a716-446655440000"]

        >>> threat_composer_generate_uuid4(3)
        ["f47ac10b-58cc-4372-a567-0e02b2c3d479",
         "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
         "6ba7b811-9dad-11d1-80b4-00c04fd430c8"]
    """
    try:
        # Validate batch_size parameter
        if not isinstance(batch_size, int) or batch_size < 1:
            return [
                f"❌ Error: batch_size must be a positive integer, got {batch_size}"
            ]

        # Generate the requested number of GUIDs
        guids = []
        for _ in range(batch_size):
            guid = str(uuid.uuid4())
            guids.append(guid)

        return guids

    except Exception as e:
        return [f"❌ Error generating GUIDs: {str(e)}"]


@tool(
    name="threat_composer_generate_uuid4_with_guidance",
    description="Generates a batch of UUIDs along with guidance on their usage",
)
def threat_composer_generate_uuid4_with_guidance(batch_size: int = 20) -> str:
    """
    Generate a batch of UUIDs with usage guidance for system prompts.

    This tool generates a specified number of UUIDs and formats them with
    detailed usage instructions. It's designed to be included in system prompts
    to provide agents with pre-generated UUIDs and clear guidelines on how to use them.

    Args:
        batch_size (int, optional): Number of UUIDs to generate. Defaults to 20.
                                   Must be a positive integer.

    Returns:
        str: A formatted string containing:
            - A numbered list of pre-generated UUIDs
            - Usage instructions for sequential UUID consumption
            - Guidance on generating additional UUIDs when needed
    """

    uuids = threat_composer_generate_uuid4(batch_size)

    if not uuids:
        return f"If you need UUIDs, use the {get_tool_name(threat_composer_generate_uuid4)} tool to generate additional ones"

    uuid_lines = [f"{i}. {uuid_str}" for i, uuid_str in enumerate(uuids, 1)]

    return f"""PRE-LOADED UUIDs:
Here are {len(uuids)} pre-generated UUIDs to use as needed for your outputs:
{chr(10).join(uuid_lines)}

IMPORTANT UUID USAGE:
- Use these UUIDs in sequential order for your outputs (use UUID #1 first, then #2, etc.)
- Each UUID should only be used once
- If you need more than {len(uuids)} UUIDs, use the {get_tool_name(threat_composer_generate_uuid4)} tool to generate additional ones
- Do NOT generate your own UUIDs manually - always use the pre-loaded ones first, then the tool if needed
"""
