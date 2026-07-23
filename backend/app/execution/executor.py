from collections import defaultdict

from app.execution.state import create_execution_state
from app.execution.dataset.dataset_handler import handle_dataset_node
from app.execution.preprocessing.preprocessing_handler import handle_preprocessing_node
from app.execution.models.model_handler import handle_model_node
from app.execution.evaluation.evaluation_handler import handle_evaluation_node

def execute_pipeline(pipeline):

    nodes = pipeline["orderedPipeline"]
    adjacency = pipeline["adjacency"]

    node_map = {
        node["id"]: node
        for node in nodes
    }

    # ------------------------------------------------
    # Build reverse graph (MULTIPLE PARENTS)
    # ------------------------------------------------

    parents = defaultdict(list)

    for src, children in adjacency.items():
        for child in children:
            parents[child].append(src)

    # ------------------------------------------------

    def execute_branch(model_node_id):

        state = create_execution_state()

        path = []

        current = model_node_id

        while True:

            path.append(current)

            if len(parents[current]) == 0:
                break

            current = parents[current][0]

        path.reverse()

        for node_id in path:

            node = node_map[node_id]

            if node["type"] == "datasetNode":

                result = handle_dataset_node(
                    node,
                    state
                )

                if result:
                    return None, result

            elif node["type"] == "preprocessingNode":

                handle_preprocessing_node(
                    node,
                    state
                )

            elif node["type"] == "modelNode":

                handle_model_node(
                    node,
                    state
                )

        return state, None

    # ------------------------------------------------

    evaluation_nodes = [

        node

        for node in nodes

        if node["type"] == "evaluationNode"

    ]

    results = {}

    # ====================================================

    for evaluation_node in evaluation_nodes:

        incoming_models = [

            parent

            for parent in parents[evaluation_node["id"]]

            if node_map[parent]["type"] == "modelNode"

        ]

        if len(incoming_models) == 0:

            continue

        best_metrics = None

        best_accuracy = -1

        best_algorithm = ""

        # ---------------------------------------------

        for model_id in incoming_models:

            state, error = execute_branch(model_id)

            if error:
                return error

            metrics = handle_evaluation_node(
                evaluation_node,
                state
            )

            algorithm = node_map[model_id]["data"].get(
                "algorithm",
                "Unknown"
            )

            print(
                f"{algorithm} Accuracy = {metrics['accuracy']}"
            )

            if metrics["accuracy"] > best_accuracy:

                best_accuracy = metrics["accuracy"]

                best_metrics = metrics

                best_algorithm = algorithm

        # ---------------------------------------------

        print(
            f"Best Model : {best_algorithm}"
        )

        results[
            evaluation_node["id"]
        ] = best_metrics

    print(results)

    return {

        "evaluations": results

    }