from io import StringIO

from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from ucimlrepo import fetch_ucirepo


router = APIRouter()

UCI_DATASETS = {
    267: "banknote_authentication",
    109: "wine",
    73: "mushroom",
    2: "adult_income",
    602: "dry_bean",
    563: "iranian_churn",
}


def _fetch_dataset_csv(dataset_id: int) -> str:
    dataset = fetch_ucirepo(id=dataset_id)
    features = dataset.data.features.copy()
    targets = dataset.data.targets.copy()

    overlapping_columns = set(features.columns).intersection(targets.columns)
    if overlapping_columns:
        targets = targets.rename(columns={name: f"target_{name}" for name in overlapping_columns})

    return features.join(targets).to_csv(index=False)


@router.get("/uci-datasets/{dataset_id}/download")
async def download_uci_dataset(dataset_id: int):
    filename = UCI_DATASETS.get(dataset_id)
    if filename is None:
        raise HTTPException(status_code=404, detail="This UCI dataset is not available in ML-Tutor.")

    try:
        csv_text = await run_in_threadpool(_fetch_dataset_csv, dataset_id)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="The dataset could not be fetched from the UCI repository. Please try again.",
        ) from exc

    return StreamingResponse(
        StringIO(csv_text),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}.csv"'},
    )
