"""
Baseline Threat Modeling Workflow

A foundational threat modeling workflow that serves as a starting point for customization.
This workflow provides a comprehensive baseline implementation that can be forked and
adapted to specific organizational needs and threat modeling methodologies.

Workflow: Code Analysis → System Modeling → STRIDE Analysis → Threat Identification →
          Mitigation Planning → Quality Assessment → Threat Composer Output

Note: This is a starting point, not a final solution. Human expertise and iteration
are essential for effective threat modeling. Consider this workflow as scaffolding
that helps you avoid starting from a blank page.
"""

from strands.multiagent import GraphBuilder
from strands.multiagent.base import Status
from strands.session.file_session_manager import FileSessionManager

from ..agents import (
    create_application_info_agent,
    create_architecture_agent,
    create_architecture_diagram_agent,
    create_dataflow_agent,
    create_dataflow_diagram_agent,
    create_mitigations_agent,
    create_threat_model_agent,
    create_threats_agent,
)
from ..config import AppConfig
from ..logging import clear_agent_context, log_debug, log_success


def create_dependency_condition(required_nodes):
    """
    Factory function to create dependency checking conditions.

    Args:
        required_nodes: List of node IDs that must be completed before the target node executes

    Returns:
        Function that checks if all required dependencies are complete
    """

    def check_dependencies(state):
        """Check if all required dependencies are complete."""
        # Debug logging to understand state
        from ..logging import log_debug

        log_debug(f"Checking dependencies for nodes: {required_nodes}")
        log_debug(
            f"Available results: {list(state.results.keys()) if hasattr(state, 'results') else 'No results'}"
        )

        # Check if state has results attribute
        if not hasattr(state, "results") or state.results is None:
            log_debug("State has no results attribute")
            return False

        for node_id in required_nodes:
            if node_id not in state.results:
                log_debug(f"Node {node_id} not found in results")
                return False

            node_result = state.results[node_id]
            log_debug(f"Node {node_id} result: {node_result}")

            # Check if result exists and has completed status
            if not node_result:
                log_debug(f"Node {node_id} has no result")
                return False

            # Check status - use Status enum instead of string comparison
            if hasattr(node_result, "status"):
                if node_result.status != Status.COMPLETED:
                    log_debug(
                        f"Node {node_id} status is {node_result.status}, not Status.COMPLETED"
                    )
                    return False
            else:
                # If no status attribute, assume completion if result exists
                log_debug(
                    f"Node {node_id} has result but no status attribute - assuming completed"
                )

        log_debug("All dependencies satisfied")
        return True

    return check_dependencies


def create_baseline_threat_modeling_workflow(
    config: AppConfig | None = None,
    session_manager: FileSessionManager | None = None,
    previous_session_path: str | None = None,
):
    """
    Create a baseline threat modeling workflow using Strands Graph architecture.

    This function constructs a foundational threat modeling workflow that serves as a
    starting point for customization. It follows Shostack's Four Question Framework
    and provides a comprehensive baseline that can be adapted to specific organizational
    needs, methodologies, and threat landscapes.

    **Important**: This is a baseline implementation designed to help you avoid starting
    from a blank page. It is NOT meant to be prescriptive or final. Human expertise,
    review, and iteration are essential for effective threat modeling. Consider forking
    and customizing this workflow to match your specific requirements.

    Workflow Architecture:
        Code Analysis → System Modeling → STRIDE Analysis → Threat Identification →
        Mitigation Planning → Quality Assessment → Threat Composer Output

    Graph Node Structure:
        - application_info: Gathers basic application context and requirements
        - architecture: Analyzes system architecture and components
        - architecture_diagram: Generates visual architecture representations
        - dataflow: Identifies data flows and trust boundaries
        - dataflow_diagram: Creates data flow diagrams
        - threats: Performs STRIDE analysis and threat identification
        - mitigations: Develops mitigation strategies for identified threats
        - threat_model: Synthesizes results into Threat Composer schema format

    Execution Flow:
        application_info → architecture → dataflow → threats → mitigations
                     ↓           ↓
        architecture_diagram  dataflow_diagram
                     ↓           ↓
                  threat_model ←←←←

    Args:
        config (Optional[AppConfig]): Application configuration object containing:
            - execution_timeout: Total workflow timeout in seconds (default: 2400)
            - node_timeout: Individual node timeout in seconds (default: 1200)
            - Additional agent-specific configuration parameters
            If None, default configuration values will be used.

        session_manager (Optional[FileSessionManager]): Session manager for agent
            persistence and state management. Enables conversation history and
            context preservation across workflow executions. If None, agents
            will operate without persistent session state.

    Returns:
        Graph: A configured Strands Graph object ready for execution. The graph
            contains all necessary agents, dependencies, and execution constraints.
            Call graph.run() to execute the complete threat modeling workflow.

    Raises:
        ValueError: If invalid configuration parameters are provided
        RuntimeError: If agent creation or graph construction fails

    Example:
        Basic usage with default configuration:
        >>> workflow = create_baseline_threat_modeling_workflow()
        >>> result = workflow.run(input_data)

        With custom configuration:
        >>> config = AppConfig(execution_timeout=3600)
        >>> session_mgr = FileSessionManager("./sessions")
        >>> workflow = create_baseline_threat_modeling_workflow(config, session_mgr)
        >>> result = workflow.run(input_data)

        Customization example (fork and modify):
        >>> # Create your own workflow based on this baseline
        >>> # Modify agents, add new nodes, change dependencies, etc.
        >>> custom_workflow = create_my_custom_threat_modeling_workflow(config)

    Note:
        - The workflow uses conditional edges to ensure the threat_model node
          only executes after all dependencies (architecture_diagram,
          dataflow_diagram, mitigations) are complete
        - Graph execution includes safeguards against infinite loops and
          timeout protection
        - Agent context is cleared before workflow-level logging to prevent
          context pollution
    """
    log_debug("Creating baseline threat modeling workflow graph")

    # Create all agents and swarms with shared configuration and incremental execution support
    application_info = create_application_info_agent(config, previous_session_path)
    architecture = create_architecture_agent(config, previous_session_path)
    architecture_diagram = create_architecture_diagram_agent(
        config, previous_session_path
    )
    dataflow = create_dataflow_agent(config, previous_session_path)
    dataflow_diagram = create_dataflow_diagram_agent(config, previous_session_path)
    threats = create_threats_agent(config, previous_session_path)
    mitigations = create_mitigations_agent(config, previous_session_path)
    threat_model = create_threat_model_agent(config, previous_session_path)

    # Build the workflow graph
    builder = GraphBuilder()

    # Add nodes to the graph
    builder.add_node(application_info, "application_info")
    builder.add_node(architecture, "architecture")
    builder.add_node(architecture_diagram, "architecture_diagram")
    builder.add_node(dataflow, "dataflow")
    builder.add_node(dataflow_diagram, "dataflow_diagram")
    builder.add_node(threats, "threats")
    builder.add_node(mitigations, "mitigations")
    builder.add_node(threat_model, "threat_model")

    # Create conditional dependency checker for threat_model
    # threat_model should only execute when ALL of its dependencies are complete
    threat_model_condition = create_dependency_condition(
        ["architecture_diagram", "dataflow_diagram", "mitigations"]
    )

    # Edges for the graph
    builder.add_edge("application_info", "architecture")
    builder.add_edge("architecture", "dataflow")
    builder.add_edge("dataflow", "threats")
    builder.add_edge("threats", "mitigations")

    builder.add_edge("architecture", "architecture_diagram")
    builder.add_edge("dataflow", "dataflow_diagram")

    # Replace direct edges with conditional edges to ensure threat_model waits for all dependencies
    builder.add_edge(
        "dataflow_diagram", "threat_model", condition=threat_model_condition
    )
    builder.add_edge(
        "architecture_diagram", "threat_model", condition=threat_model_condition
    )
    builder.add_edge("mitigations", "threat_model", condition=threat_model_condition)

    # Set entry point
    builder.set_entry_point("application_info")

    # Session manager
    builder.set_session_manager(session_manager)

    # Configure execution limits
    if config:
        builder.set_execution_timeout(config.execution_timeout)
        builder.set_node_timeout(config.node_timeout)
    else:
        builder.set_execution_timeout(2400.0)  # 40 minutes default
        builder.set_node_timeout(1200.0)  # 20 minutes per node default

    # Reset state when revisiting nodes for fresh analysis
    builder.reset_on_revisit(True)

    # Build and return the graph
    graph = builder.build()

    # Clear any agent context before logging workflow-level messages
    clear_agent_context()
    log_success("Baseline threat modeling workflow graph created successfully")

    return graph
