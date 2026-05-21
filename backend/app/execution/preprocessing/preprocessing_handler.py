def handle_preprocessing_node(
    node,
    state
):

    X_train = state[
        "X_train"
    ]

    X_test = state[
        "X_test"
    ]

    y_train = state[
        "y_train"
    ]

    method = node[
        "data"
    ].get(
        "method",
        ""
    )

    strategy = node[
        "data"
    ].get(
        "strategy",
        "average"
    )

    print(
        "\nPreprocessing Method:",
        method
    )

    print(
        "Strategy:",
        strategy
    )

    # -------------------
    # FILL MISSING VALUES
    # -------------------

    if (
        method ==
        "fillMissingValues"
    ):

        # -------------------
        # USE AVERAGE
        # -------------------

        if (
            strategy ==
            "average"
        ):

            mean_values = (
                X_train.mean(
                    numeric_only=True
                )
            )

            X_train = (
                X_train.fillna(
                    mean_values
                )
            )

            X_test = (
                X_test.fillna(
                    mean_values
                )
            )

            print(
                "Missing values filled using averages."
            )

        # -------------------
        # REMOVE ROWS
        # -------------------

        elif (
            strategy ==
            "removeRows"
        ):

            # -------------------
            # CLEAN TRAIN DATA
            # -------------------

            train_df = (
                X_train.copy()
            )

            train_df[
                "target"
            ] = y_train.values

            before_train_rows = (
                len(train_df)
            )

            train_df = (
                train_df.dropna()
            )

            after_train_rows = (
                len(train_df)
            )

            y_train = (
                train_df[
                    "target"
                ]
            )

            X_train = (
                train_df.drop(
                    columns=[
                        "target"
                    ]
                )
            )

            # -------------------
            # CLEAN TEST DATA
            # -------------------

            test_df = (
                X_test.copy()
            )

            test_df[
                "target"
            ] = state[
                "y_test"
            ].values

            before_test_rows = (
                len(test_df)
            )

            test_df = (
                test_df.dropna()
            )

            after_test_rows = (
                len(test_df)
            )

            state["y_test"] = (
                test_df[
                    "target"
                ]
            )

            X_test = (
                test_df.drop(
                    columns=[
                        "target"
                    ]
                )
            )

            print(
                "Train rows removed:",
                before_train_rows
                - after_train_rows
            )

            print(
                "Test rows removed:",
                before_test_rows
                - after_test_rows
            )

            train_df = (
                X_train.copy()
            )

            train_df[
                "target"
            ] = y_train.values

            before_rows = (
                len(train_df)
            )

            train_df = (
                train_df.dropna()
            )

            after_rows = (
                len(train_df)
            )

            y_train = (
                train_df[
                    "target"
                ]
            )

            X_train = (
                train_df.drop(
                    columns=[
                        "target"
                    ]
                )
            )

            print(
                "Rows removed:",
                before_rows
                - after_rows
            )

    # -------------------
    # REMOVE DUPLICATES
    # -------------------

    elif (
        method ==
        "removeDuplicateRows"
    ):

        train_df = (
            X_train.copy()
        )

        train_df[
            "target"
        ] = y_train.values

        before_rows = (
            len(train_df)
        )

        train_df = (
            train_df
            .drop_duplicates()
        )

        after_rows = (
            len(train_df)
        )

        y_train = (
            train_df[
                "target"
            ]
        )

        X_train = (
            train_df.drop(
                columns=[
                    "target"
                ]
            )
        )

        print(
            "Duplicate rows removed:",
            before_rows
            - after_rows
        )

    # -------------------
    # SAVE STATE
    # -------------------

    state["X_train"] = X_train
    state["X_test"] = X_test
    state["y_train"] = y_train