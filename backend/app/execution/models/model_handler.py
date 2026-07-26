from sklearn.neighbors import (
    KNeighborsClassifier
)

from sklearn.tree import (
    DecisionTreeClassifier
)

from sklearn.linear_model import (
    LogisticRegression
)

from mlxtend.classifier import ( 
    OneRClassifier
)

from sklearn.preprocessing import (
    KBinsDiscretizer
)

import numpy as np

def handle_model_node(
    node,
    state
):

    X_train = state[
        "X_train"
    ]

    y_train = state[
        "y_train"
    ]

    algorithm = node[
        "data"
    ].get(
        "algorithm",
        "knn"
    )

    print(
        "\nAlgorithm:",
        algorithm
    )

    model = None

    # -------------------
    # KNN
    # -------------------

    if algorithm == "knn":

        k = node[
            "data"
        ].get(
            "k",
            5
        )

        print(
            "K:",
            k
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
            node[
                "data"
            ].get(
                "maxDepth",
                3
            )
        )

        print(
            "Max Depth:",
            max_depth
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

    # -------------------
    # 1R
    # -------------------

    elif algorithm == "oneR":

        disc = KBinsDiscretizer(
            n_bins=5,
            encode="ordinal",
            strategy="uniform"
        )

        X_discrete  = disc.fit_transform(X_train)

        X_train = np.asarray(X_discrete).astype(int)
        y_train = np.asarray(y_train).astype(int)

        model = (
            OneRClassifier()
        )

         # Save for evaluation
        state["oneR_discretizer"] = disc
        state["algorithm"] = "oneR"


    model.fit(
        X_train,
        y_train
    )

    print(
        "Model Training Complete"
    )

    state["model"] = model