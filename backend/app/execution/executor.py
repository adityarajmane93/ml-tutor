from app.execution.state import (
    create_execution_state
)

from app.execution.dataset.dataset_handler import (
    handle_dataset_node
)

from app.execution.preprocessing.preprocessing_handler import (
    handle_preprocessing_node
)

from app.execution.models.model_handler import (
    handle_model_node
)

from app.execution.evaluation.evaluation_handler import (
    handle_evaluation_node
)


def execute_pipeline(
    ordered_pipeline
):

    state = (
        create_execution_state()
    )

    for node in ordered_pipeline:

        node_type = node["type"]

        print(
            f"\n=== EXECUTING {node_type} ==="
        )

        # -------------------
        # DATASET
        # -------------------

        if (
            node_type ==
            "datasetNode"
        ):

            result = (
                handle_dataset_node(
                    node,
                    state
                )
            )

            if result:
                return result

        # -------------------
        # PREPROCESSING
        # -------------------

        elif (
            node_type ==
            "preprocessingNode"
        ):

            handle_preprocessing_node(
                node,
                state
            )

        # -------------------
        # MODEL
        # -------------------

        elif (
            node_type ==
            "modelNode"
        ):

            handle_model_node(
                node,
                state
            )

        # -------------------
        # EVALUATION
        # -------------------

        elif (
            node_type ==
            "evaluationNode"
        ):

            return (
                handle_evaluation_node(
                    node,
                    state
                )
            )

    return {
        "status":
        "pipeline incomplete"
    }