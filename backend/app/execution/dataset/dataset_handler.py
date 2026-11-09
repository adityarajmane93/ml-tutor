import pandas as pd
from fastapi import HTTPException

from sklearn.model_selection import (
    train_test_split
)


# This is an interactive learning tool, not a batch-training service. Exact
# k-NN prediction becomes impractical for 40k+ rows because it compares every
# test sample with every training sample. A representative cap keeps all
# supported algorithms responsive while preserving the original uploaded file.
MAX_INTERACTIVE_ROWS = 15_000


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

    selected_features = node["data"].get("selectedFeatures")
    target_column = node["data"].get("targetColumn")

    if selected_features and target_column:

        X = df[selected_features].copy()
        y = df[target_column].copy()

    else:

        X = df.iloc[:, :-1].copy()
        y = df.iloc[:, -1].copy()

    total_rows = len(df)
    if total_rows > MAX_INTERACTIVE_ROWS:
        try:
            sampled_index, _ = train_test_split(
                df.index,
                train_size=MAX_INTERACTIVE_ROWS,
                random_state=42,
                stratify=y,
            )
            df = df.loc[sampled_index].copy()
        except ValueError:
            # Stratification is not possible for malformed or very rare
            # target classes. A fixed seed still makes the fallback repeatable.
            df = df.sample(n=MAX_INTERACTIVE_ROWS, random_state=42).copy()

        if selected_features and target_column:
            X = df[selected_features].copy()
            y = df[target_column].copy()
        else:
            X = df.iloc[:, :-1].copy()
            y = df.iloc[:, -1].copy()

        state["sampling"] = {
            "datasetNodeId": node["id"],
            "sourceRows": total_rows,
            "usedRows": len(df),
        }

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

    # Downstream nodes consume the train/test partitions. Avoid a third full
    # one-hot-encoding pass solely to populate these legacy state fields.
    state["X"] = None
    state["y"] = None

    state["X_train"] = X_train
    state["X_test"] = X_test

    state["y_train"] = y_train
    state["y_test"] = y_test

    return None
