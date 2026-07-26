from sklearn.metrics import (
    accuracy_score,
    f1_score, 
    recall_score, 
    precision_score
)

import numpy as np

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

    algorithm = state.get("algorithm")

    if algorithm == "oneR":

        disc = state["oneR_discretizer"]

        X_test = disc.transform(X_test)

        X_test = np.asarray(X_test).astype(int)
        y_test = np.asarray(y_test).astype(int)  

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