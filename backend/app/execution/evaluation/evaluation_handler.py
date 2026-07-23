from sklearn.metrics import (
    accuracy_score,
    f1_score, 
    recall_score, 
    precision_score
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
    precision = (
        precision_score(
            y_test,
            predictions,
            average="weighted"
        )
    )
    recall = (
        recall_score(
            y_test,
            predictions,
            average="weighted"
        )
    )

    F1 = (
        f1_score(
            y_test,
            predictions,
            average="weighted"
        )
    )
    print(f"Accuracy:{accuracy}, Precision: {precision}, Recall: {recall}, F1 Score: {F1}" )

    return {
        "accuracy":float(accuracy),
        "precision":float(precision),
        "recall":float(recall),
        "F1":float(F1)
    }