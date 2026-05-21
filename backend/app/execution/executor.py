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

from sklearn.tree import (
    DecisionTreeClassifier
)

from sklearn.linear_model import (
    LogisticRegression
)

from sklearn.preprocessing import (
    MinMaxScaler
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
                test_size=0.5,
                random_state=42
            )

        # -------------------
        # PREPROCESSING NODE
        # -------------------

        elif node_type == "preprocessingNode":

            method = node[
                "data"
            ].get(
                "method",
                "standardScaler"
            )

            # -------------------
            # STANDARD SCALER
            # -------------------

            if (
                method ==
                "standardScaler"
            ):

                scaler = StandardScaler()

            # -------------------
            # MINMAX SCALER
            # -------------------

            elif (
                method ==
                "minMaxScaler"
            ):

                scaler = MinMaxScaler()

            # -------------------
            # NO PREPROCESSING
            # -------------------

            elif (
                method == "none"
            ):

                scaler = None

            # -------------------
            # APPLY SCALER
            # -------------------

            if scaler is not None:

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

            algorithm = node[
                "data"
            ].get(
                "algorithm",
                "knn"
            )

            # -------------------
            # KNN
            # -------------------

            if algorithm == "knn":

                k = node["data"].get(
                    "k",
                    5
                )

                model = (
                    KNeighborsClassifier(
                        n_neighbors=k
                    )
                )

            # -------------------
            # DECISION TREE
            # -------------------

            elif (
                algorithm ==
                "decisionTree"
            ):

                max_depth = (
                    node["data"].get(
                        "maxDepth",
                        3
                    )
                )

                model = (
                    DecisionTreeClassifier(
                        max_depth=max_depth
                    )
                )

            # -------------------
            # LOGISTIC REGRESSION
            # -------------------

            elif (
                algorithm ==
                "logisticRegression"
            ):

                model = (
                    LogisticRegression(
                        max_iter=1000
                    )
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