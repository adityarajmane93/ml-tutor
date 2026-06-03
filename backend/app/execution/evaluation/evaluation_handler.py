from sklearn.metrics import (
    accuracy_score
)


def handle_evaluation_node(
    node,
    state
):

    print(
        "\nRunning Evaluation..."
    )

    model = state[
        "model"
    ]

    X_test = state[
        "X_test"
    ]

    y_test = state[
        "y_test"
    ]

    if model is None:

        raise HTTPException(
            status_code=400, 
            detail="No trained model found."
        )
        

    predictions = (
        model.predict(
            X_test
        )
    )

    accuracy = (
        accuracy_score(
            y_test,
            predictions
        )
    )

    print(
        "Accuracy:",
        accuracy
    )

    return {
        "accuracy":
        float(accuracy)
    }