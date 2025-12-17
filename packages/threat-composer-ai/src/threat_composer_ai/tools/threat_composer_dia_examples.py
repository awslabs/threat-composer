"""
Diagram Examples Tool.

Provides example code for different types of diagrams using the diagrams library.
"""

from enum import Enum
from typing import Any

from strands.types.tools import ToolResult, ToolUse

from threat_composer_ai.logging import log_debug


class DiagramType(str, Enum):
    """Types of diagram examples available."""

    ALL = "all"
    AWS = "aws"
    K8S = "k8s"
    ONPREM = "onprem"
    SEQUENCE = "sequence"
    FLOW = "flow"
    CLASS = "class"
    CUSTOM = "custom"


TOOL_SPEC = {
    "name": "threat_composer_dia_examples",
    "description": """Get example code for different types of architecture diagrams.

Returns example Python code showing how to use the diagrams library for various diagram types.
Use these examples as reference when creating your own architecture diagrams.

Available diagram types:
- all: Returns all available examples (default)
- aws: AWS architecture diagram examples
- k8s: Kubernetes architecture examples
- onprem: On-premises infrastructure examples
- sequence: Sequence diagram examples
- flow: Flow diagram examples
- class: Class diagram examples
- custom: Custom icon examples
""",
    "inputSchema": {
        "type": "object",
        "properties": {
            "diagram_type": {
                "type": "string",
                "description": "Type of diagram example to return",
                "enum": [
                    "all",
                    "aws",
                    "k8s",
                    "onprem",
                    "sequence",
                    "flow",
                    "class",
                    "custom",
                ],
                "default": "all",
            },
        },
        "required": [],
    },
}


def _get_examples(diagram_type: DiagramType) -> dict[str, str]:
    """Get example code for the specified diagram type."""
    examples = {}

    # Basic examples
    if diagram_type in [DiagramType.AWS, DiagramType.ALL]:
        examples["aws_basic"] = """with Diagram("Web Service Architecture", show=False):
    ELB("lb") >> EC2("web") >> RDS("userdb")"""

    if diagram_type in [DiagramType.SEQUENCE, DiagramType.ALL]:
        examples["sequence"] = """with Diagram("User Authentication Flow", show=False):
    user = User("User")
    login = InputOutput("Login Form")
    auth = Decision("Authenticated?")
    success = Action("Access Granted")
    failure = Action("Access Denied")

    user >> login >> auth
    auth >> success
    auth >> failure"""

    if diagram_type in [DiagramType.FLOW, DiagramType.ALL]:
        examples["flow"] = """with Diagram("Order Processing Flow", show=False):
    start = Predefined("Start")
    order = InputOutput("Order Received")
    check = Decision("In Stock?")
    process = Action("Process Order")
    wait = Delay("Backorder")
    ship = Action("Ship Order")
    end = Predefined("End")

    start >> order >> check
    check >> process >> ship >> end
    check >> wait >> process"""

    if diagram_type in [DiagramType.CLASS, DiagramType.ALL]:
        examples["class"] = """with Diagram("Simple Class Diagram", show=False):
    base = Python("BaseClass")
    child1 = Python("ChildClass1")
    child2 = Python("ChildClass2")

    base >> child1
    base >> child2"""

    # Advanced AWS examples
    if diagram_type in [DiagramType.AWS, DiagramType.ALL]:
        examples[
            "aws_grouped_workers"
        ] = """with Diagram("Grouped Workers", show=False, direction="TB"):
    ELB("lb") >> [EC2("worker1"),
                  EC2("worker2"),
                  EC2("worker3"),
                  EC2("worker4"),
                  EC2("worker5")] >> RDS("events")"""

        examples[
            "aws_clustered_web_services"
        ] = """with Diagram("Clustered Web Services", show=False):
    dns = Route53("dns")
    lb = ELB("lb")

    with Cluster("Services"):
        svc_group = [ECS("web1"),
                     ECS("web2"),
                     ECS("web3")]

    with Cluster("DB Cluster"):
        db_primary = RDS("userdb")
        db_primary - [RDS("userdb ro")]

    memcached = ElastiCache("memcached")

    dns >> lb >> svc_group
    svc_group >> db_primary
    svc_group >> memcached"""

        examples[
            "aws_event_processing"
        ] = """with Diagram("Event Processing", show=False):
    source = EKS("k8s source")

    with Cluster("Event Flows"):
        with Cluster("Event Workers"):
            workers = [ECS("worker1"),
                       ECS("worker2"),
                       ECS("worker3")]

        queue = SQS("event queue")

        with Cluster("Processing"):
            handlers = [Lambda("proc1"),
                        Lambda("proc2"),
                        Lambda("proc3")]

    store = S3("events store")
    dw = Redshift("analytics")

    source >> workers >> queue >> handlers
    handlers >> store
    handlers >> dw"""

        examples[
            "aws_bedrock"
        ] = """with Diagram("S3 Image Processing with Bedrock", show=False, direction="LR"):
    user = User("User")

    with Cluster("Amazon S3 Bucket"):
        input_folder = S3("Input Folder")
        output_folder = S3("Output Folder")

    lambda_function = Lambda("Image Processor Function")
    bedrock = Bedrock("Claude Sonnet 3.7")

    user >> Edge(label="Upload Image") >> input_folder
    input_folder >> Edge(label="Trigger") >> lambda_function
    lambda_function >> Edge(label="Process Image") >> bedrock
    bedrock >> Edge(label="Return Bounding Box") >> lambda_function
    lambda_function >> Edge(label="Upload Processed Image") >> output_folder
    output_folder >> Edge(label="Download Result") >> user"""

    # Kubernetes examples
    if diagram_type in [DiagramType.K8S, DiagramType.ALL]:
        examples[
            "k8s_exposed_pod"
        ] = """with Diagram("Exposed Pod with 3 Replicas", show=False):
    net = Ingress("domain.com") >> Service("svc")
    net >> [Pod("pod1"),
            Pod("pod2"),
            Pod("pod3")] << ReplicaSet("rs") << Deployment("dp") << HPA("hpa")"""

        examples["k8s_stateful"] = """with Diagram("Stateful Architecture", show=False):
    with Cluster("Apps"):
        svc = Service("svc")
        sts = StatefulSet("sts")

        apps = []
        for _ in range(3):
            pod = Pod("pod")
            pvc = PVC("pvc")
            pod - sts - pvc
            apps.append(svc >> pod >> pvc)

    apps << PV("pv") << StorageClass("sc")"""

    # On-premises examples
    if diagram_type in [DiagramType.ONPREM, DiagramType.ALL]:
        examples[
            "onprem_web_service"
        ] = """with Diagram("Advanced Web Service with On-Premises", show=False):
    ingress = Nginx("ingress")

    metrics = Prometheus("metric")
    metrics << Grafana("monitoring")

    with Cluster("Service Cluster"):
        grpcsvc = [Server("grpc1"),
                   Server("grpc2"),
                   Server("grpc3")]

    with Cluster("Sessions HA"):
        primary = Redis("session")
        primary - Redis("replica") << metrics

    grpcsvc >> primary

    with Cluster("Database HA"):
        primary = PostgreSQL("users")
        primary - PostgreSQL("replica") << metrics

    grpcsvc >> primary

    aggregator = Fluentd("logging")
    aggregator >> Kafka("stream") >> Spark("analytics")

    ingress >> grpcsvc >> aggregator"""

        examples[
            "onprem_web_service_colored"
        ] = """with Diagram(name="Advanced Web Service with On-Premise (colored)", show=False):
    ingress = Nginx("ingress")

    metrics = Prometheus("metric")
    metrics << Edge(color="firebrick", style="dashed") << Grafana("monitoring")

    with Cluster("Service Cluster"):
        grpcsvc = [Server("grpc1"),
                   Server("grpc2"),
                   Server("grpc3")]

    with Cluster("Sessions HA"):
        primary = Redis("session")
        primary - Edge(color="brown", style="dashed") - Redis("replica") << Edge(label="collect") << metrics

    grpcsvc >> Edge(color="brown") >> primary

    with Cluster("Database HA"):
        primary = PostgreSQL("users")
        primary - Edge(color="brown", style="dotted") - PostgreSQL("replica") << Edge(label="collect") << metrics

    grpcsvc >> Edge(color="black") >> primary

    aggregator = Fluentd("logging")
    aggregator >> Edge(label="parse") >> Kafka("stream") >> Edge(color="black", style="bold") >> Spark("analytics")

    ingress >> Edge(color="darkgreen") << grpcsvc >> Edge(color="darkorange") >> aggregator"""

    # Custom icon examples
    if diagram_type in [DiagramType.CUSTOM, DiagramType.ALL]:
        examples[
            "custom_rabbitmq"
        ] = """# Download an image to be used into a Custom Node class
rabbitmq_url = "https://jpadilla.github.io/rabbitmqapp/assets/img/icon.png"
rabbitmq_icon = "rabbitmq.png"
urlretrieve(rabbitmq_url, rabbitmq_icon)

with Diagram("Broker Consumers", show=False):
    with Cluster("Consumers"):
        consumers = [Pod("worker"),
                     Pod("worker"),
                     Pod("worker")]

    queue = Custom("Message queue", rabbitmq_icon)

    queue >> consumers >> Aurora("Database")"""

    return examples


def threat_composer_dia_examples(tool: ToolUse, **kwargs: Any) -> ToolResult:
    """Get example code for different types of diagrams."""
    tool_input = tool.get("input", {})

    diagram_type_str = tool_input.get("diagram_type", "all")

    try:
        diagram_type = DiagramType(diagram_type_str.lower())
    except ValueError:
        diagram_type = DiagramType.ALL

    log_debug(f"Getting diagram examples for type: {diagram_type}")

    try:
        examples = _get_examples(diagram_type)

        # Format response
        lines = [f"# Diagram Examples ({diagram_type.value})\n"]
        for name, code in examples.items():
            lines.append(f"## {name}\n```python\n{code}\n```\n")

        response_text = "\n".join(lines)

        return {
            "toolUseId": tool.get("toolUseId", "default-id"),
            "status": "success",
            "content": [{"text": response_text}],
        }

    except Exception as e:
        error_msg = f"Error getting diagram examples: {e}"
        return {
            "toolUseId": tool.get("toolUseId", "default-id"),
            "status": "error",
            "content": [{"text": error_msg}],
        }
