import pandas as pd
from fastapi import HTTPException

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

        raise HTTPException(
            status_code=400, 
            detail="No dataset uploaded. Please connect a valid dataset block first."
        )


    # -------------------
    # DATAFRAME
    # -------------------

    df = pd.DataFrame(
        dataset
    )

    # -------------------
    # FEATURES / TARGET
    # -------------------

    # X = df.iloc[:, :-1]

    # y = df.iloc[:, -1]
    selected_features = node["data"].get("selectedFeatures")
    target_column = node["data"].get("targetColumn")

    if selected_features and target_column:

        X = df[selected_features].copy()
        y = df[target_column].copy()

    else:

        X = df.iloc[:, :-1].copy()
        y = df.iloc[:, -1].copy()

    # Convert genuinely numeric columns without destroying categorical values.
    # Categorical predictors are encoded after the split so the test set cannot
    # introduce information into the training columns.
    numeric_columns = []
    for column in X.columns:
        converted = pd.to_numeric(X[column], errors="coerce")
        if converted.notna().sum() == X[column].notna().sum():
            X[column] = converted
            numeric_columns.append(column)

    categorical_columns = [
        column for column in X.columns if column not in numeric_columns
    ]

    print("\nDATAFRAME:")
    print(df.head())

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

    testSize = node[
        "data"
    ].get("testSize")

    if testSize is None:
        testSize=30

    testSize = int(testSize)
    if testSize <= 0 or testSize >= 100:
        raise HTTPException(
            status_code=400,
            detail="Test size must be between 1 and 99 percent."
        )

    (
        X_train,
        X_test,
        y_train,
        y_test
    ) = train_test_split(
        X,
        y,
        test_size=testSize/100,
        random_state=42
    )

    if categorical_columns:
        X_train = pd.get_dummies(
            X_train,
            columns=categorical_columns,
            dummy_na=True,
            dtype=float
        )
        X_test = pd.get_dummies(
            X_test,
            columns=categorical_columns,
            dummy_na=True,
            dtype=float
        )
        X_train, X_test = X_train.align(
            X_test,
            join="left",
            axis=1,
            fill_value=0
        )

    X_encoded = pd.get_dummies(
        X,
        columns=categorical_columns,
        dummy_na=True,
        dtype=float
    ).reindex(columns=X_train.columns, fill_value=0)

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

    state["X"] = X_encoded
    state["y"] = y

    state["X_train"] = X_train
    state["X_test"] = X_test

    state["y_train"] = y_train
    state["y_test"] = y_test

    return None
