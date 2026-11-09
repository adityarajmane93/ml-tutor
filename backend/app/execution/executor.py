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

    # Dataset parsing, splitting, and one-hot encoding are independent of the
    # model.  Several model nodes commonly share that same upstream path, so
    # cache the prepared state once per path instead of redoing this expensive
    # work for every model comparison.
    prepared_states = {}

    def path_to(node_id):
        """Return the currently supported first-parent path to a node."""
        path = []
        current = node_id

        while True:
            path.append(current)
            if not parents[current]:
                break
            current = parents[current][0]

        return tuple(reversed(path))

    def prepare_branch(model_node_id):
        path = path_to(model_node_id)
        prefix = path[:-1]

        if prefix not in prepared_states:
            state = create_execution_state()

            for node_id in prefix:
                node = node_map[node_id]

                if node["type"] == "datasetNode":
                    result = handle_dataset_node(node, state)
                    if result:
                        return None, result
                elif node["type"] == "preprocessingNode":
                    handle_preprocessing_node(node, state)

            prepared_states[prefix] = state

        # Preprocessing handlers replace their data objects rather than mutate
        # them in place. A shallow copy isolates each fitted model while
        # avoiding an expensive DataFrame copy for every model node.
        return dict(prepared_states[prefix]), None

    def execute_branch(model_node_id):
        state, error = prepare_branch(model_node_id)
        if error:
            return None, error

        handle_model_node(node_map[model_node_id], state)
        return state, None

    # ------------------------------------------------

    evaluation_nodes = [

        node

        for node in nodes

        if node["type"] == "evaluationNode"

    ]

    results = {}
    sampling_details = {}

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

            sampling = state.get("sampling")
            if sampling:
                sampling_details[sampling["datasetNodeId"]] = sampling

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

    response = {"evaluations": results}
    if sampling_details:
        response["execution"] = {
            "sampling": list(sampling_details.values())
        }

    return response
