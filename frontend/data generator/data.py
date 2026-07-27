import numpy as np
import pandas as pd

# =====================================================
# Synthetic Student Performance Dataset Generator
# =====================================================

np.random.seed(42)
N = 2000

# -----------------------------------------------------
# Generate Features
# -----------------------------------------------------

attendance = np.clip(
    np.random.normal(75, 15, N),
    30,
    100
)

midsem = np.clip(
    attendance * 0.35 + np.random.normal(0, 10, N),
    0,
    50
)

assignment = np.clip(
    attendance * 0.65 + np.random.normal(15, 15, N),
    0,
    100
)

participation = np.clip(
    np.round(attendance / 20 + np.random.normal(2, 1.5, N)),
    0,
    10
)

quiz = np.clip(
    (midsem / 50) * 20 + np.random.normal(0, 3, N),
    0,
    20
)

# -----------------------------------------------------
# Hidden Academic Performance Score
# -----------------------------------------------------

performance = (
    0.30 * attendance +
    0.30 * (midsem * 2) +
    0.20 * assignment +
    0.10 * (participation * 10) +
    0.10 * (quiz * 5)
)

# Academic rules
performance -= np.where(attendance < 50, 12, 0)
performance += np.where(assignment > 90, 5, 0)
performance -= np.where(quiz < 5, 8, 0)

# Small natural variation
performance += np.random.normal(0, 7, N)

# -----------------------------------------------------
# Target Variable
# -----------------------------------------------------

result = np.where(performance >= 60, 1, 0)

# -----------------------------------------------------
# Create DataFrame
# -----------------------------------------------------

df = pd.DataFrame({
    "Attendance": attendance.round(1),
    "Midsem Score": midsem.round(1),
    "Assignment Score": assignment.round(1),
    "Class Participation": participation.astype(int),
    "Quiz Score": quiz.round(1),
    "Result": result
})

# -----------------------------------------------------
# Introduce Missing Values
# -----------------------------------------------------

missing_rates = {
    "Attendance": 0.05,
    "Midsem Score": 0.08,
    "Assignment Score": 0.07,
    "Class Participation": 0.10,
    "Quiz Score": 0.05
}

for column, rate in missing_rates.items():
    idx = np.random.choice(
        df.index,
        int(rate * N),
        replace=False
    )
    df.loc[idx, column] = np.nan

# -----------------------------------------------------
# Save Dataset
# -----------------------------------------------------

df.to_csv("student_data.csv", index=False)

# -----------------------------------------------------
# Summary
# -----------------------------------------------------

print("=" * 50)
print("Synthetic Student Dataset Generated")
print("=" * 50)

print(f"\nRows: {len(df)}")

print("\nClass Distribution:")
print(df["Result"].value_counts())

print("\nMissing Values:")
print(df.isnull().sum())

print("\nFirst Five Rows:")
print(df.head())