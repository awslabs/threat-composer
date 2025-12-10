"""
Threat Composer V1 Pydantic Model

This module provides a direct Pydantic model implementation for the threat-composer-v1.schema.json
data format. The model provides type safety and validation for Threat Composer data structures
with proper enforcement of all constraints including string lengths, enums, and business rules.

Usage:
    from threat_composer_ai.models.threat_composer_v1 import ThreatComposerV1Model

    # Create an instance from JSON data
    threat_model = ThreatComposerV1Model(**json_data)

    # Validate and access typed data
    print(threat_model.schema_version)
    print(threat_model.applicationInfo.name if threat_model.applicationInfo else None)
"""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class MetadataItem(BaseModel):
    """Base class for metadata items with key-value pairs."""

    key: str
    value: str | list[str]

    model_config = ConfigDict(extra="forbid")


class CommentsMetadata(MetadataItem):
    """Metadata item for comments."""

    key: str = Field("Comments", description="Comment key")
    value: str = Field(..., max_length=1000, description="Comment value")


class CustomMetadata(MetadataItem):
    """Metadata item for custom fields."""

    key: str = Field(
        ..., max_length=50, pattern=r"^custom:.*", description="Custom metadata key"
    )
    value: str | list[str] = Field(..., description="Custom metadata value")


class SourceMetadata(MetadataItem):
    """Metadata item for source type."""

    key: str = Field("source", description="Source key")
    value: str = Field(..., description="Source type")


class MitigationPackIdMetadata(MetadataItem):
    """Metadata item for mitigation pack ID."""

    key: str = Field("mitigationPackId", description="Mitigation pack ID key")
    value: str = Field(
        ...,
        min_length=1,
        max_length=30,
        description="Identifier for the mitigation pack",
    )


class MitigationPackMitigationIdMetadata(MetadataItem):
    """Metadata item for mitigation pack mitigation ID."""

    key: str = Field(
        "mitigationPackMitigationId", description="Mitigation pack mitigation ID key"
    )
    value: str = Field(
        ...,
        max_length=36,
        description="UUID v4 identifier for the specific mitigation within the pack",
    )


class StrideMetadata(MetadataItem):
    """Metadata item for STRIDE classification."""

    key: str = Field("STRIDE", description="STRIDE key")
    value: list[str] = Field(..., description="STRIDE categories")

    @field_validator("value")
    @classmethod
    def validate_stride_values(cls, v):
        valid_stride = {"S", "T", "R", "I", "D", "E"}
        for item in v:
            if item not in valid_stride:
                raise ValueError(
                    f"Invalid STRIDE value: {item}. Must be one of {valid_stride}"
                )
        return v


class PriorityMetadata(MetadataItem):
    """Metadata item for priority."""

    key: str = Field("Priority", description="Priority key")
    value: str = Field(..., description="Priority level")

    @field_validator("value")
    @classmethod
    def validate_priority(cls, v):
        valid_priorities = {"High", "Medium", "Low"}
        if v not in valid_priorities:
            raise ValueError(
                f"Invalid priority: {v}. Must be one of {valid_priorities}"
            )
        return v


class ThreatPackIdMetadata(MetadataItem):
    """Metadata item for threat pack ID."""

    key: str = Field("threatPackId", description="Threat pack ID key")
    value: str = Field(
        ..., min_length=1, max_length=30, description="Identifier for the threat pack"
    )


class ThreatPackThreatIdMetadata(MetadataItem):
    """Metadata item for threat pack threat ID."""

    key: str = Field("threatPackThreatId", description="Threat pack threat ID key")
    value: str = Field(
        ...,
        max_length=36,
        description="UUID v4 identifier for the specific threat within the pack",
    )


class ThreatPackMitigationCandidateIdMetadata(MetadataItem):
    """Metadata item for threat pack mitigation candidate ID."""

    key: str = Field(
        "threatPackMitigationCandidateId",
        description="Threat pack mitigation candidate ID key",
    )
    value: str = Field(
        ...,
        max_length=36,
        description="UUID v4 identifier for the mitigation candidate from the threat pack",
    )


class BaseEntity(BaseModel):
    """Base class for entities with common fields."""

    id: str = Field(..., max_length=36, description="UUID v4 identifier")
    numericId: int = Field(..., description="Numeric identifier for display purposes")
    displayOrder: int | None = Field(None, description="Order for displaying items")

    model_config = ConfigDict(extra="forbid")

    @field_validator("id")
    @classmethod
    def validate_uuid(cls, v):
        try:
            # Validate that it's a proper UUID format
            UUID(v, version=4)
        except ValueError as e:
            raise ValueError(f"Invalid UUID v4 format: {v}") from e
        return v


class TaggedEntity(BaseEntity):
    """Base class for entities that can have tags."""

    tags: list[str] | None = Field(None, description="Categorization tags")

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v):
        if v is not None:
            for tag in v:
                if not tag or len(tag.strip()) == 0:
                    raise ValueError("Tags cannot be empty")
                if len(tag) > 30:
                    raise ValueError(
                        f"Tag '{tag}' exceeds 30 character limit (current length: {len(tag)})"
                    )
                if len(tag) < 1:
                    raise ValueError(f"Tag '{tag}' is too short (minimum length: 1)")
        return v


class ApplicationInfo(BaseModel):
    """Information about the application being threat modeled."""

    name: str | None = Field(
        None, max_length=200, description="Application name. Plain-text"
    )
    description: str | None = Field(
        None,
        max_length=100000,
        description="Markdown detailed description of the application. Start your headers from H3 maximum",
    )

    model_config = ConfigDict(extra="forbid")


class Architecture(BaseModel):
    """System architecture information about the application being threat modeled."""

    description: str | None = Field(
        None,
        max_length=100000,
        description="Markdown detailed description of the application architecture. Start your headers from H3 maximum",
    )
    image: str | None = Field(
        None,
        description="Architecture diagram image. Image URL or base64 encoded image data. Supports image/* MIME types, though browser rendering compatibility varies by format. For URLs: maximum 2048 characters. For base64: maximum 1000000 characters (approximately 750KB for typical images due to base64 encoding overhead). Common formats (PNG/JPG/GIF) are automatically compressed, making original file size limits difficult to specify precisely. The constraint applies to the resulting base64 string length rather than the original file size.",
    )

    model_config = ConfigDict(extra="forbid")


class Dataflow(BaseModel):
    """Data flow information about the application being threat modeled."""

    description: str | None = Field(
        None,
        max_length=100000,
        description="Markdown detailed description of the application data flows. Start your headers from H3 maximum",
    )
    image: str | None = Field(
        None,
        description="Data-flow diagram image. Image URL or base64 encoded image data. Supports image/* MIME types, though browser rendering compatibility varies by format. For URLs: maximum 2048 characters. For base64: maximum 1000000 characters (approximately 750KB for typical images due to base64 encoding overhead). Common formats (PNG/JPG/GIF) are automatically compressed, making original file size limits difficult to specify precisely. The constraint applies to the resulting base64 string length rather than the original file size.",
    )

    model_config = ConfigDict(extra="forbid")


class Assumption(TaggedEntity):
    """Assumptions about the design, threats and mitigations of the application being threat modeled."""

    metadata: list[CommentsMetadata | CustomMetadata] | None = Field(
        None, description="Additional metadata as key-value pairs"
    )
    content: str = Field(..., max_length=1000, description="Assumption. Plain-text")

    model_config = ConfigDict(extra="forbid")


class Mitigation(TaggedEntity):
    """Mitigations for the application being threat modeled."""

    metadata: (
        list[
            CommentsMetadata
            | CustomMetadata
            | SourceMetadata
            | MitigationPackIdMetadata
            | MitigationPackMitigationIdMetadata
        ]
        | None
    ) = Field(
        None, description="Additional metadata as key-value pairs for mitigations"
    )
    content: str = Field(..., max_length=1000, description="Mitigation. Plain-text")
    status: str | None = Field(None, description="Status of the mitigation")

    model_config = ConfigDict(extra="forbid")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = {
                "mitigationIdentified",
                "mitigationInProgress",
                "mitigationResolved",
                "mitigationResolvedWillNotAction",
            }
            if v not in valid_statuses:
                raise ValueError(
                    f"Invalid mitigation status: {v}. Must be one of {valid_statuses}"
                )
        return v


class Threat(TaggedEntity):
    """Threats for the application being threat modeled."""

    metadata: (
        list[
            CommentsMetadata
            | CustomMetadata
            | SourceMetadata
            | StrideMetadata
            | PriorityMetadata
            | ThreatPackIdMetadata
            | ThreatPackThreatIdMetadata
            | ThreatPackMitigationCandidateIdMetadata
        ]
        | None
    ) = Field(None, description="Additional metadata as key-value pairs for threats")
    threatSource: str | None = Field(
        None,
        max_length=200,
        description="The entity taking action. For example: An actor (a useful default), An internet-based actor, An internal or external actor.",
    )
    prerequisites: str | None = Field(
        None,
        max_length=200,
        description="Conditions or requirements that must be met for a threat source's action to be viable. For example: -with access to another user's token. -who has administrator access -with user permissions - in a mitm position -with a network path to the API. If no prerequistes known return empty string, if know return but first word must be lower case",
    )
    threatAction: str | None = Field(
        None,
        max_length=200,
        description="The action being performed by the threat source. For example: -spoof another user -tamper with data stored in the database -make thousands of concurrent requests. first word must be lower case",
    )
    threatImpact: str | None = Field(
        None,
        max_length=200,
        description="What impact this has on the system.The direct impact of a successful threat action. For example: - unauthorized access to the user's bank account information -modifying the username for the all-time high score. -a web application being unable to handle other user requests.if know return but first word must be lower case",
    )
    impactedGoal: list[str] | None = Field(
        None,
        description="The information security or business objective that is negatively affected.  This is most commonly the CIA triad: -confidentiality, -integrity, -availability. If not known return empty string in array, else strings in array first word must be lower case",
    )
    impactedAssets: list[str] | None = Field(
        None,
        description="List of assets affected by this threat. If not known return empty string in array, else strings in array first word must be lower case",
    )
    statement: str | None = Field(
        None,
        max_length=1400,
        description="concatenate the above as follows into a one of the following permutations based on if the default is available or not - trim any repated white space into a single white space: 1/ A/an [threat_source] [prerequisites] can [threat_action], 2/ A/an [threat_source] [prerequisites] can [threat_action], which leads to [threat_impact], 3/ A/an [threat_source] [prerequisites] can [threat_action], resulting in reduced [impacted_goal], 4/ A/An [threat_source] [prerequisites] can [threat_action], which leads to [threat_impact], resulting in reduced [impacted_goal], 5/ A/An [threat_source] [prerequisites] can [threat_action], negatively impacting [impacted_assets], 6/ A/An [threat_source] [prerequisites] can [threat_action], which leads to [threat_impact], negatively impacting [impacted_assets], 7/ A/An [threat_source] [prerequisites] can [threat_action], resulting in reduced [impacted_goal] of [impacted_assets], 8/ A/An [threat_source] [prerequisites] can [threat_action], which leads to [threat_impact], resulting in reduced [impacted_goal] of [impacted_assets]",
    )
    customTemplate: str | None = Field(
        None,
        max_length=200,
        description="Custom template used for threat statement generation. Example: A [threatSource] [prerequisites] can [threatAction]",
    )
    status: str | None = Field(None, description="Status of the threat")

    model_config = ConfigDict(extra="forbid")

    @field_validator("impactedGoal")
    @classmethod
    def validate_impacted_goal(cls, v):
        if v is not None:
            for goal in v:
                if len(goal) > 200:
                    raise ValueError(
                        f"Impacted goal '{goal}' exceeds 200 character limit"
                    )
        return v

    @field_validator("impactedAssets")
    @classmethod
    def validate_impacted_assets(cls, v):
        if v is not None:
            for asset in v:
                if len(asset) > 200:
                    raise ValueError(
                        f"Impacted asset '{asset}' exceeds 200 character limit"
                    )
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = {
                "threatIdentified",
                "threatResolved",
                "threatResolvedNotUseful",
            }
            if v not in valid_statuses:
                raise ValueError(
                    f"Invalid threat status: {v}. Must be one of {valid_statuses}"
                )
        return v


class AssumptionLink(BaseModel):
    """Links between assumptions and threats/mitigations."""

    type: str = Field(..., description="Type of link")
    assumptionId: str = Field(
        ..., min_length=36, max_length=36, description="UUID for the assumption"
    )
    linkedId: str = Field(
        ...,
        min_length=36,
        max_length=36,
        description="UUID of the linked threat or mitigation",
    )

    model_config = ConfigDict(extra="forbid")

    @field_validator("type")
    @classmethod
    def validate_type(cls, v):
        valid_types = {"Mitigation", "Threat"}
        if v not in valid_types:
            raise ValueError(f"Invalid link type: {v}. Must be one of {valid_types}")
        return v

    @field_validator("assumptionId", "linkedId")
    @classmethod
    def validate_uuid_length(cls, v):
        try:
            UUID(v, version=4)
        except ValueError as e:
            raise ValueError(f"Invalid UUID v4 format: {v}") from e
        return v


class MitigationLink(BaseModel):
    """Links between mitigations and threats."""

    mitigationId: str = Field(
        ..., min_length=36, max_length=36, description="UUID for the mitigation"
    )
    linkedId: str = Field(
        ...,
        min_length=36,
        max_length=36,
        description="UUID of the linked threat or assumption",
    )

    model_config = ConfigDict(extra="forbid")

    @field_validator("mitigationId", "linkedId")
    @classmethod
    def validate_uuid_length(cls, v):
        try:
            UUID(v, version=4)
        except ValueError as e:
            raise ValueError(f"Invalid UUID v4 format: {v}") from e
        return v


class ThreatComposerV1Model(BaseModel):
    """
    Pydantic model for Threat Composer V1 data format.

    This model provides runtime validation and type safety for threat modeling data
    with proper enforcement of all constraints from the threat-composer-v1.schema.json.

    The model supports all fields defined in the schema including:
    - schema: Version identifier (required)
    - applicationInfo: Application details (optional)
    - architecture: Architecture information (optional)
    - dataflow: Data flow information (optional)
    - assumptions: List of assumptions (optional)
    - mitigations: List of mitigations (optional)
    - threats: List of threats (optional)
    - assumptionLinks: Links between assumptions and threats/mitigations (optional)
    - mitigationLinks: Links between mitigations and threats (optional)

    Example:
        >>> data = {"schema": 1, "applicationInfo": {"name": "My App"}}
        >>> model = ThreatComposerV1Model(**data)
        >>> print(model.schema_version)  # 1
        >>> print(model.applicationInfo.name)  # "My App"
    """

    # Use alias to avoid shadowing BaseModel.schema() method while maintaining JSON compatibility
    schema_version: int = Field(
        ...,
        alias="schema",
        json_schema_extra={"maximum": 1},
        description="Schema version identifier",
    )
    applicationInfo: ApplicationInfo | None = Field(
        None, description="Information about the application being threat modeled"
    )
    architecture: Architecture | None = Field(
        None,
        description="System architecture information about the application being threat modeled",
    )
    dataflow: Dataflow | None = Field(
        None,
        description="Data flow information about the application being threat modeled",
    )
    assumptions: list[Assumption] | None = Field(
        None,
        description="Assumptions about the design, threats and migations of the application being threat modeled",
    )
    mitigations: list[Mitigation] | None = Field(
        None, description="Mitigations for the application being threat modeled"
    )
    threats: list[Threat] | None = Field(
        None, description="Threats for the application being threat modeled"
    )
    assumptionLinks: list[AssumptionLink] | None = Field(
        None, description="Links between assumptions and threats/mitigations"
    )
    mitigationLinks: list[MitigationLink] | None = Field(
        None, description="Links between mitigations and threats"
    )

    model_config = ConfigDict(extra="forbid")

    @field_validator("schema_version")
    @classmethod
    def validate_schema_version(cls, v):
        if v > 1:
            raise ValueError(
                f"Schema version {v} is not supported. Maximum supported version is 1."
            )
        return v


# Export the model class name for easier imports
__all__ = ["ThreatComposerV1Model"]
