from app.execution.state import create_execution_state
from app.execution.dataset.dataset_handler import handle_dataset_node
from app.execution.preprocessing.preprocessing_handler import handle_preprocessing_node
from app.execution.models.model_handler import handle_model_node
from app.execution.evaluation.evaluation_handler import handle_evaluation_node

def execute_pipeline(ordered_pipeline):
    state = create_execution_state()

    nodes_to_execute = []

    # 1. Safely extract the array of nodes from the payload
    if isinstance(ordered_pipeline, list):
        nodes_to_execute = ordered_pipeline
    elif isinstance(ordered_pipeline, dict):
        # Look for the nodes array inside the dictionary
        if "nodes" in ordered_pipeline and isinstance(ordered_pipeline["nodes"], list):
            nodes_to_execute = ordered_pipeline["nodes"]
        else:
            # Fallback: Search the dictionary for any array that looks like a list of nodes
            for key, value in ordered_pipeline.items():
                if isinstance(value, list) and len(value) > 0 and isinstance(value[0], dict) and "type" in value[0]:
                    print(f"Found node array under key: '{key}'")
                    nodes_to_execute = value
                    break
                    
    if not nodes_to_execute:
        print("\nERROR: Could not find a list of nodes in the payload.")
        print("Payload received:", ordered_pipeline)
        return {"status": "error", "message": "Invalid pipeline format: No nodes found."}

    # 2. Execute the nodes safely
    for node in nodes_to_execute:
        
        # Skip if it's somehow not a dictionary
        if not isinstance(node, dict):
            continue

        node_type = node.get("type")

        if not node_type:
            continue

        print(f"\n=== EXECUTING {node_type} ===")

        # -------------------
        # DATASET
        # -------------------
        if node_type == "datasetNode":
            result = handle_dataset_node(node, state)
            if result:
                return result

        # -------------------
        # PREPROCESSING
        # -------------------
        elif node_type == "preprocessingNode":
            handle_preprocessing_node(node, state)

        # -------------------
        # MODEL
        # -------------------
        elif node_type == "modelNode":
            handle_model_node(node, state)

        # -------------------
        # EVALUATION
        # -------------------
        elif node_type == "evaluationNode":
            return handle_evaluation_node(node, state)

    return {"status": "pipeline incomplete"}