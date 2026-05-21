import pandas as pd

from sklearn.model_selection import (
    train_test_split
)


def handle_dataset_node(
    node,
    state
):

    dataset = node[
        "data"
    ].get("dataset")

    if dataset is None:

        return {
            "status":
            "No dataset uploaded."
        }

    # -------------------
    # DATAFRAME
    # -------------------

    df = pd.DataFrame(
        dataset
    )

    # -------------------
    # CONVERT NUMERIC
    # -------------------

    df = df.apply(

        lambda col:

        pd.to_numeric(
            col,
            errors="coerce"
        )

        if (
            col.name !=
            df.columns[-1]
        )

        else col
    )

    print("\nDATAFRAME:")
    print(df.head())

    # -------------------
    # FEATURES / TARGET
    # -------------------

    X = df.iloc[:, :-1]

    y = df.iloc[:, -1]

    print(
        "\nDataset Loaded:"
    )

    print(
        "Rows:",
        len(df)
    )

    print(
        "Features:",
        list(X.columns)
    )

    print(
        "Target:",
        y.name
    )

    # -------------------
    # TRAIN TEST SPLIT
    # -------------------

    (
        X_train,
        X_test,
        y_train,
        y_test
    ) = train_test_split(
        X,
        y,
        test_size=0.3,
        random_state=42
    )

    print(
        "\nTrain/Test Split Complete"
    )

    print(
        "X_train:",
        X_train.shape
    )

    print(
        "X_test:",
        X_test.shape
    )

    # -------------------
    # SAVE STATE
    # -------------------

    state["X"] = X
    state["y"] = y

    state["X_train"] = X_train
    state["X_test"] = X_test

    state["y_train"] = y_train
    state["y_test"] = y_test

    return None