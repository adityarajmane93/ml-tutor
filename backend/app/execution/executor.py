from sklearn.datasets import load_iris

from sklearn.model_selection import (
    train_test_split
)

from sklearn.preprocessing import (
    StandardScaler
)

from sklearn.neighbors import (
    KNeighborsClassifier
)

from sklearn.metrics import (
    accuracy_score
)


def execute_pipeline(
    ordered_pipeline
):

    X = None
    y = None

    X_train = None
    X_test = None

    y_train = None
    y_test = None

    model = None

    for node in ordered_pipeline:

        node_type = node["type"]

        # -------------------
        # DATASET NODE
        # -------------------

        if node_type == "datasetNode":

            iris = load_iris()

            X = iris.data
            y = iris.target

            (
                X_train,
                X_test,
                y_train,
                y_test
            ) = train_test_split(
                X,
                y,
                test_size=0.2,
                random_state=42
            )

        # -------------------
        # PREPROCESSING NODE
        # -------------------

        elif node_type == "preprocessingNode":

            scaler = StandardScaler()

            X_train = scaler.fit_transform(
                X_train
            )

            X_test = scaler.transform(
                X_test
            )

        # -------------------
        # MODEL NODE
        # -------------------

        elif node_type == "modelNode":
            k = node["data"].get(
                "k",
                5
            )

            model = KNeighborsClassifier(
                n_neighbors=k
            )

            model.fit(
                X_train,
                y_train
            )

        # -------------------
        # EVALUATION NODE
        # -------------------

        elif node_type == "evaluationNode":

            predictions = model.predict(
                X_test
            )

            accuracy = accuracy_score(
                y_test,
                predictions
            )

            return {
                "accuracy": float(
                    accuracy
                )
            }

    return {
        "status": "pipeline incomplete"
    }