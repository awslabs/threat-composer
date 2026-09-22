"""
Tests for the per-model Bedrock capability registry.

These cover the two failure modes the registry exists to prevent:

1. Sending a sampling parameter to a model that rejects it with a 400.
2. Requesting an output budget above a model's ceiling, which is also a 400.

The second one has bitten this package twice, both times because the documented
"64K" limit for Sonnet 4.5 is exclusive - Bedrock rejects maxTokens=64000 with
"Try again with a maximum tokens value that is lower than 64000". The
resolved-budget test below is the regression guard for that.
"""

from unittest.mock import patch

import pytest

from threat_composer_ai.agents.common import get_agent_model_config
from threat_composer_ai.config.model_capabilities import (
    _DEFAULT_CAPABILITIES,
    _MODEL_CAPABILITIES,
    accepts_sampling_params,
    is_known_model,
    is_sampling_param_error,
    mark_model_no_sampling_support,
    model_capabilities,
    reset_runtime_state,
    resolve_max_output_tokens,
)

# Hard per-response output limits enforced by Bedrock, as observed in its
# rejection messages. The registry must always resolve to something STRICTLY
# below these, because the limits are exclusive.
HARD_OUTPUT_LIMITS = {
    "global.anthropic.claude-sonnet-4-5-20250929-v1:0": 64_000,
    "global.anthropic.claude-sonnet-5": 128_000,
    "us.anthropic.claude-opus-4-7": 128_000,
    "us.anthropic.claude-opus-4-8": 128_000,
    "global.anthropic.claude-sonnet-4-6": 128_000,
    "global.anthropic.claude-haiku-4-5-20251001-v1:0": 64_000,
}

# Every agent type the pipeline builds, plus the "test" type the pre-flight
# inference probe uses.
ALL_AGENT_TYPES = [
    "application_info",
    "architecture",
    "architecture_diagram",
    "dataflow",
    "dataflow_diagram",
    "threats",
    "mitigations",
    "threat_model",
    "test",
]

MODELS_REJECTING_SAMPLING = [
    "global.anthropic.claude-sonnet-5",
    "us.anthropic.claude-sonnet-5",
    "anthropic.claude-sonnet-5",
    "us.anthropic.claude-opus-4-7",
    "us.anthropic.claude-opus-4-8",
]

MODELS_ACCEPTING_SAMPLING = [
    "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
    "global.anthropic.claude-sonnet-4-6",
    "global.anthropic.claude-haiku-4-5-20251001-v1:0",
]


@pytest.fixture(autouse=True)
def _clean_runtime_state():
    """Registry runtime caches are module level; isolate every test."""
    reset_runtime_state()
    yield
    reset_runtime_state()


class TestFamilyMatching:
    """Ids are matched by family substring so one row covers every id form."""

    @pytest.mark.parametrize(
        "model_id",
        [
            "anthropic.claude-sonnet-5",  # bare
            "global.anthropic.claude-sonnet-5",  # global inference profile
            "us.anthropic.claude-sonnet-5",  # geo profile
            "eu.anthropic.claude-sonnet-5",
            "au.anthropic.claude-sonnet-5",
        ],
    )
    def test_prefixes_resolve_to_same_family(self, model_id):
        assert is_known_model(model_id)
        assert model_capabilities(model_id).max_output_tokens == 127_999
        assert accepts_sampling_params(model_id) is False

    def test_dated_and_versioned_suffix_resolves(self):
        model_id = "global.anthropic.claude-sonnet-4-5-20250929-v1:0"
        assert is_known_model(model_id)
        assert model_capabilities(model_id).max_output_tokens == 63_999

    def test_no_family_is_a_prefix_of_another(self):
        """Guards the claim that row order is not load-bearing."""
        families = [family for family, _ in _MODEL_CAPABILITIES]
        for family in families:
            others = [f for f in families if f != family]
            assert not any(family in other for other in others), (
                f"family {family!r} is a substring of another entry, "
                f"which makes registry order significant"
            )


class TestUnknownModels:
    def test_unknown_model_gets_conservative_defaults(self):
        caps = model_capabilities("global.anthropic.claude-sonnet-6")
        assert caps == _DEFAULT_CAPABILITIES
        assert caps.max_output_tokens == 32_768

    def test_unknown_model_is_not_known(self):
        assert is_known_model("global.anthropic.claude-sonnet-6") is False

    def test_default_budget_is_below_every_known_ceiling(self):
        """An unlisted model must never be sent a budget a real model rejects."""
        smallest = min(limit for limit in HARD_OUTPUT_LIMITS.values())
        assert _DEFAULT_CAPABILITIES.max_output_tokens < smallest

    def test_unknown_model_warns_once_per_id(self):
        with patch(
            "threat_composer_ai.config.model_capabilities.log_warning"
        ) as mock_warn:
            model_capabilities("anthropic.made-up-model")
            model_capabilities("anthropic.made-up-model")
            model_capabilities("anthropic.made-up-model")
            assert mock_warn.call_count == 1

    def test_known_model_does_not_warn(self):
        with patch(
            "threat_composer_ai.config.model_capabilities.log_warning"
        ) as mock_warn:
            model_capabilities("global.anthropic.claude-sonnet-5")
            mock_warn.assert_not_called()


class TestSamplingParams:
    @pytest.mark.parametrize("model_id", MODELS_REJECTING_SAMPLING)
    def test_rejecting_families(self, model_id):
        assert accepts_sampling_params(model_id) is False

    @pytest.mark.parametrize("model_id", MODELS_ACCEPTING_SAMPLING)
    def test_accepting_families(self, model_id):
        assert accepts_sampling_params(model_id) is True

    def test_unknown_model_is_permissive(self):
        """Matches historical behaviour for genuinely old models."""
        assert accepts_sampling_params("anthropic.some-old-model") is True

    def test_runtime_mark_overrides_the_table(self):
        """The pre-flight probe must be able to correct an unlisted model."""
        model_id = "anthropic.brand-new-rejecting-model"
        assert accepts_sampling_params(model_id) is True

        mark_model_no_sampling_support(model_id)
        assert accepts_sampling_params(model_id) is False

    def test_runtime_mark_is_per_model(self):
        mark_model_no_sampling_support("anthropic.model-a")
        assert accepts_sampling_params("anthropic.model-a") is False
        assert accepts_sampling_params("anthropic.model-b") is True


class TestSamplingParamErrorDetection:
    def test_matches_observed_bedrock_message(self):
        error = Exception(
            "An error occurred (ValidationException) when calling the "
            "ConverseStream operation: `temperature` is deprecated for this model"
        )
        assert is_sampling_param_error(error) is True

    @pytest.mark.parametrize(
        "message",
        [
            "top_p is deprecated for this model",
            "top_k is not supported for this model",
            "temperature is not accepted by this model",
            "temperature may not be specified for this model",
        ],
    )
    def test_matches_wording_variants(self, message):
        """Detection should survive Bedrock rewording the rejection."""
        assert is_sampling_param_error(Exception(message)) is True

    @pytest.mark.parametrize(
        "message",
        [
            "The maximum tokens you requested exceeds the model limit of 64000",
            "An error occurred (AccessDeniedException)",
            "An error occurred (ThrottlingException): Too many requests",
            "Model not found",
            "temperature is 0.3",  # names a param but is not a rejection
        ],
    )
    def test_ignores_unrelated_errors(self, message):
        assert is_sampling_param_error(Exception(message)) is False


class TestBudgetClamping:
    def test_request_below_ceiling_passes_through(self):
        assert (
            resolve_max_output_tokens("global.anthropic.claude-sonnet-5", 32_768)
            == 32_768
        )

    def test_request_above_ceiling_is_clamped(self):
        model_id = "global.anthropic.claude-sonnet-4-5-20250929-v1:0"
        assert resolve_max_output_tokens(model_id, 100_000) == 63_999

    def test_clamped_to_conservative_default_for_unknown_model(self):
        assert resolve_max_output_tokens("anthropic.unlisted-model", 100_000) == 32_768

    def test_larger_model_is_not_clamped_down_unnecessarily(self):
        """Sonnet 5 must get the full budget Sonnet 4.5 cannot have."""
        want = 100_000
        assert (
            resolve_max_output_tokens("global.anthropic.claude-sonnet-5", want) == want
        )
        assert (
            resolve_max_output_tokens(
                "global.anthropic.claude-sonnet-4-5-20250929-v1:0", want
            )
            < want
        )


class TestRegistryValuesAreUsable:
    """Regression guards for the exclusive-limit bug."""

    @pytest.mark.parametrize("model_id,hard_limit", HARD_OUTPUT_LIMITS.items())
    def test_declared_ceiling_is_strictly_below_hard_limit(self, model_id, hard_limit):
        declared = model_capabilities(model_id).max_output_tokens
        assert declared < hard_limit, (
            f"{model_id} declares {declared}, but Bedrock rejects anything "
            f">= {hard_limit}. The documented limit is exclusive."
        )

    @pytest.mark.parametrize("model_id,hard_limit", HARD_OUTPUT_LIMITS.items())
    @pytest.mark.parametrize("agent_type", ALL_AGENT_TYPES)
    def test_every_agent_budget_is_accepted_by_every_known_model(
        self, agent_type, model_id, hard_limit
    ):
        """No agent, on any known model, may resolve to a rejected budget.

        This is the test that would have caught shipping 65536 and then 64000.
        """
        want = get_agent_model_config(agent_type)["max_tokens"]
        resolved = resolve_max_output_tokens(model_id, want)
        assert resolved < hard_limit

    def test_unknown_model_budgets_are_accepted_by_the_smallest_known_model(self):
        smallest = min(HARD_OUTPUT_LIMITS.values())
        for agent_type in ALL_AGENT_TYPES:
            want = get_agent_model_config(agent_type)["max_tokens"]
            resolved = resolve_max_output_tokens("anthropic.unlisted", want)
            assert resolved < smallest
