"""Tests for ThreatComposerV1Model Pydantic validation."""

import pytest
from pydantic import ValidationError

from threat_composer_ai.models.threat_composer_v1 import (
    CommentsMetadata,
    CustomMetadata,
    PriorityMetadata,
    SourceMetadata,
    StrideMetadata,
    Threat,
    ThreatComposerV1Model,
)


class TestMetadataKeyDiscrimination:
    """Test that metadata types are correctly discriminated by key."""

    def test_comments_metadata_accepts_comments_key(self):
        """CommentsMetadata should only accept key='Comments'."""
        m = CommentsMetadata(key="Comments", value="test comment")
        assert m.key == "Comments"

    def test_comments_metadata_rejects_other_keys(self):
        """CommentsMetadata should reject keys other than 'Comments'."""
        with pytest.raises(ValidationError) as exc_info:
            CommentsMetadata(key="Priority", value="test")
        assert "Input should be 'Comments'" in str(exc_info.value)

    def test_priority_metadata_accepts_priority_key(self):
        """PriorityMetadata should only accept key='Priority'."""
        m = PriorityMetadata(key="Priority", value="High")
        assert m.key == "Priority"

    def test_priority_metadata_rejects_other_keys(self):
        """PriorityMetadata should reject keys other than 'Priority'."""
        with pytest.raises(ValidationError) as exc_info:
            PriorityMetadata(key="Comments", value="High")
        assert "Input should be 'Priority'" in str(exc_info.value)

    def test_stride_metadata_accepts_stride_key(self):
        """StrideMetadata should only accept key='STRIDE'."""
        m = StrideMetadata(key="STRIDE", value=["S", "T"])
        assert m.key == "STRIDE"

    def test_stride_metadata_rejects_other_keys(self):
        """StrideMetadata should reject keys other than 'STRIDE'."""
        with pytest.raises(ValidationError) as exc_info:
            StrideMetadata(key="Priority", value=["S"])
        assert "Input should be 'STRIDE'" in str(exc_info.value)

    def test_source_metadata_accepts_source_key(self):
        """SourceMetadata should only accept key='source'."""
        m = SourceMetadata(key="source", value="threatPack")
        assert m.key == "source"

    def test_source_metadata_rejects_other_keys(self):
        """SourceMetadata should reject keys other than 'source'."""
        with pytest.raises(ValidationError) as exc_info:
            SourceMetadata(key="Priority", value="threatPack")
        assert "Input should be 'source'" in str(exc_info.value)

    def test_custom_metadata_accepts_custom_prefix(self):
        """CustomMetadata should accept keys starting with 'custom:'."""
        m = CustomMetadata(key="custom:myfield", value="myvalue")
        assert m.key == "custom:myfield"

    def test_custom_metadata_rejects_non_custom_keys(self):
        """CustomMetadata should reject keys not starting with 'custom:'."""
        with pytest.raises(ValidationError) as exc_info:
            CustomMetadata(key="Priority", value="test")
        assert "String should match pattern" in str(exc_info.value)


class TestPriorityValidation:
    """Test Priority metadata value validation."""

    def test_priority_accepts_high(self):
        """Priority should accept 'High'."""
        m = PriorityMetadata(key="Priority", value="High")
        assert m.value == "High"

    def test_priority_accepts_medium(self):
        """Priority should accept 'Medium'."""
        m = PriorityMetadata(key="Priority", value="Medium")
        assert m.value == "Medium"

    def test_priority_accepts_low(self):
        """Priority should accept 'Low'."""
        m = PriorityMetadata(key="Priority", value="Low")
        assert m.value == "Low"

    def test_priority_rejects_critical(self):
        """Priority should reject 'Critical' - not a valid value."""
        with pytest.raises(ValidationError) as exc_info:
            PriorityMetadata(key="Priority", value="Critical")
        assert "Invalid priority: Critical" in str(exc_info.value)

    def test_priority_rejects_invalid_values(self):
        """Priority should reject arbitrary invalid values."""
        with pytest.raises(ValidationError) as exc_info:
            PriorityMetadata(key="Priority", value="Urgent")
        assert "Invalid priority" in str(exc_info.value)


class TestStrideValidation:
    """Test STRIDE metadata value validation."""

    def test_stride_accepts_valid_values(self):
        """STRIDE should accept valid STRIDE letters."""
        m = StrideMetadata(key="STRIDE", value=["S", "T", "R", "I", "D", "E"])
        assert m.value == ["S", "T", "R", "I", "D", "E"]

    def test_stride_accepts_subset(self):
        """STRIDE should accept a subset of valid letters."""
        m = StrideMetadata(key="STRIDE", value=["S", "I"])
        assert m.value == ["S", "I"]

    def test_stride_rejects_invalid_letters(self):
        """STRIDE should reject invalid letters."""
        with pytest.raises(ValidationError) as exc_info:
            StrideMetadata(key="STRIDE", value=["X"])
        assert "Invalid STRIDE value" in str(exc_info.value)


class TestThreatMetadataUnion:
    """Test that Threat correctly validates metadata union types."""

    def test_threat_accepts_valid_priority(self):
        """Threat should accept valid Priority metadata."""
        t = Threat(
            id="08249a15-c2e3-430b-b175-16ecc91f3eb3",
            numericId=1,
            metadata=[{"key": "Priority", "value": "High"}],
        )
        assert t.metadata[0].value == "High"
        assert type(t.metadata[0]).__name__ == "PriorityMetadata"

    def test_threat_rejects_invalid_priority_critical(self):
        """Threat should reject Priority='Critical' - the key bug case."""
        with pytest.raises(ValidationError) as exc_info:
            Threat(
                id="08249a15-c2e3-430b-b175-16ecc91f3eb3",
                numericId=1,
                metadata=[{"key": "Priority", "value": "Critical"}],
            )
        # Should fail on PriorityMetadata validation, not match CommentsMetadata
        errors = exc_info.value.errors()
        # Find the PriorityMetadata error
        priority_errors = [
            e for e in errors if "PriorityMetadata" in str(e.get("loc", []))
        ]
        assert len(priority_errors) > 0
        assert "Invalid priority" in str(priority_errors[0].get("msg", ""))

    def test_threat_accepts_valid_stride(self):
        """Threat should accept valid STRIDE metadata."""
        t = Threat(
            id="08249a15-c2e3-430b-b175-16ecc91f3eb3",
            numericId=1,
            metadata=[{"key": "STRIDE", "value": ["S", "T"]}],
        )
        assert t.metadata[0].value == ["S", "T"]
        assert type(t.metadata[0]).__name__ == "StrideMetadata"

    def test_threat_accepts_comments(self):
        """Threat should accept Comments metadata."""
        t = Threat(
            id="08249a15-c2e3-430b-b175-16ecc91f3eb3",
            numericId=1,
            metadata=[{"key": "Comments", "value": "This is a comment"}],
        )
        assert t.metadata[0].value == "This is a comment"
        assert type(t.metadata[0]).__name__ == "CommentsMetadata"

    def test_threat_accepts_custom_metadata(self):
        """Threat should accept custom: prefixed metadata."""
        t = Threat(
            id="08249a15-c2e3-430b-b175-16ecc91f3eb3",
            numericId=1,
            metadata=[{"key": "custom:myfield", "value": "myvalue"}],
        )
        assert t.metadata[0].key == "custom:myfield"
        assert type(t.metadata[0]).__name__ == "CustomMetadata"

    def test_threat_accepts_multiple_metadata(self):
        """Threat should accept multiple metadata items of different types."""
        t = Threat(
            id="08249a15-c2e3-430b-b175-16ecc91f3eb3",
            numericId=1,
            metadata=[
                {"key": "STRIDE", "value": ["S", "T"]},
                {"key": "Priority", "value": "High"},
                {"key": "Comments", "value": "A comment"},
            ],
        )
        assert len(t.metadata) == 3
        assert type(t.metadata[0]).__name__ == "StrideMetadata"
        assert type(t.metadata[1]).__name__ == "PriorityMetadata"
        assert type(t.metadata[2]).__name__ == "CommentsMetadata"


class TestFullModelValidation:
    """Test full ThreatComposerV1Model validation."""

    def test_minimal_valid_model(self):
        """Model should accept minimal valid data."""
        model = ThreatComposerV1Model(schema=1)
        assert model.schema_version == 1

    def test_model_with_threats(self):
        """Model should accept threats with valid metadata."""
        model = ThreatComposerV1Model(
            schema=1,
            threats=[
                {
                    "id": "08249a15-c2e3-430b-b175-16ecc91f3eb3",
                    "numericId": 1,
                    "metadata": [
                        {"key": "Priority", "value": "High"},
                        {"key": "STRIDE", "value": ["S"]},
                    ],
                }
            ],
        )
        assert len(model.threats) == 1
        assert model.threats[0].metadata[0].value == "High"

    def test_model_rejects_invalid_priority(self):
        """Model should reject threats with invalid Priority values."""
        with pytest.raises(ValidationError):
            ThreatComposerV1Model(
                schema=1,
                threats=[
                    {
                        "id": "08249a15-c2e3-430b-b175-16ecc91f3eb3",
                        "numericId": 1,
                        "metadata": [{"key": "Priority", "value": "Critical"}],
                    }
                ],
            )
