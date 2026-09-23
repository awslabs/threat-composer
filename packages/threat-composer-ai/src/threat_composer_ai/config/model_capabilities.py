"""Per-model capability registry for Bedrock inference configuration.

Bedrock exposes no API for per-model limits. ``GetFoundationModel`` returns
modalities, streaming support and lifecycle only, and the API reference for
inference configuration states that the documented parameter ranges are
arbitrary and the real limits must be taken from the specific model. Model
capabilities therefore have to be declared, which is why this module exists.

Two capabilities affect every agent this package builds:

``accepts_sampling_params``
    Newer Anthropic models reject a non-default ``temperature`` / ``top_p`` /
    ``top_k`` with a 400 ``ValidationException`` rather than ignoring it.
    botocore does not retry a 400, so sending a sampling parameter to one of
    these models fails the request outright.

``max_output_tokens``
    The per-response generation cap, sent as Bedrock Converse
    ``inferenceConfig.maxTokens``. Requesting more is a 400. On models where
    reasoning is always on, thinking tokens are drawn from this same budget, so
    a cap sized only for the visible response truncates mid-tool-call and
    raises ``MaxTokensReachedException``, which Strands treats as unrecoverable.

Values are verified against Bedrock Converse rather than copied from
documentation, because the documentation is inaccurate at the boundary. Both
Anthropic and AWS describe Claude Sonnet 4.5 as having a "64K" output limit, but
Bedrock rejects ``maxTokens=64000`` with::

    The maximum tokens you requested exceeds the model limit of 64000.
    Try again with a maximum tokens value that is lower than 64000.

The limit is exclusive, so the largest usable value is 63999. Entries below
store the largest *usable* value for that reason.

Adding a new model family is one row in :data:`_MODEL_CAPABILITIES`. An
unlisted family resolves to :data:`_DEFAULT_CAPABILITIES` and logs a warning
once; see that constant for what the degraded behaviour is.
"""

from dataclasses import dataclass

from ..logging import log_debug, log_warning


@dataclass(frozen=True)
class ModelCapabilities:
    """Capabilities of a Bedrock model family that affect how agents call it."""

    # False for models that 400 on a non-default temperature/top_p/top_k.
    accepts_sampling_params: bool

    # Largest usable inferenceConfig.maxTokens. This is the documented ceiling
    # minus one where the boundary is exclusive (see module docstring). Not the
    # context window, which is much larger and counts input as well.
    max_output_tokens: int


# Matched as a substring against the full model id, so a single row covers every
# form of an id: bare (``anthropic.claude-sonnet-5``), geo- or global-prefixed
# (``global.``/``us.``/``eu.``/``au.``) and date-and-version suffixed
# (``-20250929-v1:0``). No family substring is a prefix of another, so ordering
# is not load-bearing; kept newest-first for readability.
#
# max_output_tokens provenance:
#   claude-sonnet-4-5  63_999 - verified: Bedrock rejects 64000 as shown above.
#   everything else    documented ceiling minus one. The exclusive boundary is
#                      confirmed only for Sonnet 4.5, so the same margin is
#                      applied conservatively rather than assuming an inclusive
#                      limit elsewhere. Costs one token of headroom.
_MODEL_CAPABILITIES: tuple[tuple[str, ModelCapabilities], ...] = (
    (
        "claude-sonnet-5",
        ModelCapabilities(accepts_sampling_params=False, max_output_tokens=127_999),
    ),
    (
        "claude-opus-4-8",
        ModelCapabilities(accepts_sampling_params=False, max_output_tokens=127_999),
    ),
    (
        "claude-opus-4-7",
        ModelCapabilities(accepts_sampling_params=False, max_output_tokens=127_999),
    ),
    (
        "claude-sonnet-4-6",
        ModelCapabilities(accepts_sampling_params=True, max_output_tokens=127_999),
    ),
    (
        "claude-sonnet-4-5",
        ModelCapabilities(accepts_sampling_params=True, max_output_tokens=63_999),
    ),
    (
        "claude-haiku-4-5",
        ModelCapabilities(accepts_sampling_params=True, max_output_tokens=63_999),
    ),
)

# Applied to any model family not listed above.
#
# accepts_sampling_params is permissive because that matches the behaviour older
# models have always had. A future sampling-rejecting family that is not added
# above will therefore be sent a temperature and 400. That is recoverable but
# only reactively: the pre-flight probe in validation.aws_validator detects the
# error and calls mark_model_no_sampling_support(), after which every model built
# in this process omits sampling params. That recovery does not run under
# --skip-validation, so a new rejecting family must still be added here.
#
# max_output_tokens is conservative rather than optimistic: it sits below the cap
# of every model currently published, so an unlisted model is never sent a
# maxTokens it will reject. The cost is that a large unlisted model is
# under-used, which can surface as truncation on the heaviest agents until a row
# is added.
_DEFAULT_CAPABILITIES = ModelCapabilities(
    accepts_sampling_params=True,
    max_output_tokens=32_768,
)


# Model ids already warned about, so the warning is emitted once per id rather
# than on every agent construction.
_warned_unknown_models: set[str] = set()

# Model ids observed at runtime to reject sampling parameters. Populated by
# mark_model_no_sampling_support() and consulted by accepts_sampling_params(),
# so a model the table does not know about can still be handled once Bedrock has
# told us about it. Process-local: a long-lived MCP server learns once, whereas
# each CLI invocation starts empty.
_models_without_sampling_support: set[str] = set()


def model_capabilities(model_id: str) -> ModelCapabilities:
    """Resolve capabilities for a Bedrock model id by family substring match."""
    for family, capabilities in _MODEL_CAPABILITIES:
        if family in model_id:
            return capabilities

    if model_id not in _warned_unknown_models:
        _warned_unknown_models.add(model_id)
        log_warning(
            f"Unknown model family '{model_id}' - using conservative defaults "
            f"(sampling params allowed, max output {_DEFAULT_CAPABILITIES.max_output_tokens}). "
            f"Add the family to _MODEL_CAPABILITIES in config/model_capabilities.py "
            f"to use the model's real limits."
        )
    return _DEFAULT_CAPABILITIES


def is_known_model(model_id: str) -> bool:
    """True when the model id matches a registered family."""
    return any(family in model_id for family, _ in _MODEL_CAPABILITIES)


def accepts_sampling_params(model_id: str) -> bool:
    """True when a non-default temperature/top_p/top_k may be sent.

    Consults both the declared capability and anything learned at runtime, so a
    model marked by :func:`mark_model_no_sampling_support` is honoured even when
    the table claims otherwise.
    """
    if model_id in _models_without_sampling_support:
        return False
    return model_capabilities(model_id).accepts_sampling_params


def mark_model_no_sampling_support(model_id: str) -> None:
    """Record that a model rejected sampling parameters.

    Called when Bedrock returns a ValidationException indicating temperature,
    top_p or top_k is not accepted. Every model built afterwards in this process
    omits sampling parameters for this id.
    """
    _models_without_sampling_support.add(model_id)


def resolve_max_output_tokens(model_id: str, requested: int) -> int:
    """Clamp a requested output budget to what the model will accept.

    Agents declare the budget they want and this narrows it to the model's
    ceiling, so pointing an agent at a smaller model can never produce a
    maxTokens the model rejects. Requesting the full ceiling costs nothing:
    Bedrock bills actual output, not the requested cap, and under-requesting
    risks truncation.
    """
    ceiling = model_capabilities(model_id).max_output_tokens
    if requested > ceiling:
        log_debug(
            f"Clamping max_tokens {requested} to {ceiling} for model '{model_id}'"
        )
        return ceiling
    return requested


# Sampling parameter names Bedrock may name in a rejection.
_SAMPLING_PARAM_NAMES = ("temperature", "top_p", "top_k")

# Phrasings seen or plausible in a sampling-parameter rejection. Matching a set
# of markers rather than one exact string keeps detection working if the wording
# changes; the observed message is "`temperature` is deprecated for this model".
_REJECTION_MARKERS = (
    "deprecated",
    "not supported",
    "unsupported",
    "not accepted",
    "cannot be used",
    "may not be specified",
)


def is_sampling_param_error(error: Exception) -> bool:
    """True when an exception looks like a sampling-parameter rejection."""
    message = str(error).lower()
    return any(name in message for name in _SAMPLING_PARAM_NAMES) and any(
        marker in message for marker in _REJECTION_MARKERS
    )


def reset_runtime_state() -> None:
    """Clear state learned at runtime. Intended for tests."""
    _models_without_sampling_support.clear()
    _warned_unknown_models.clear()
