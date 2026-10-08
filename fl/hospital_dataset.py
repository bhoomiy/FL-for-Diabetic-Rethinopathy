
import csv
import json
import os
import shutil
import tempfile
import zipfile
from collections import Counter
from pathlib import Path
from PIL import Image, UnidentifiedImageError

MAX_ZIP_BYTES = 500 * 1024 * 1024
MAX_FILES = 10000
CLASS_NAMES = [
    "No DR", "Mild", "Moderate",
    "Severe", "Proliferative DR"
]


def get_dataset_info(storage):
    root = Path(storage) / "datasets" / "active"
    manifest = root / "manifest.json"

    if not manifest.is_file():
        return {"status": "empty", "samples": 0}

    with open(manifest, encoding="utf-8") as f:
        data = json.load(f)

    return {"status": "ready", **data}


def install_dataset(uploaded_file, storage):
    storage = Path(storage)
    datasets_root = storage / "datasets"
    datasets_root.mkdir(parents=True, exist_ok=True)

    staging = Path(tempfile.mkdtemp(
        prefix="upload_", dir=datasets_root
    ))
    archive_path = staging / "dataset.zip"
    extraction = staging / "content"
    extraction.mkdir()

    try:
        size = 0
        with open(archive_path, "wb") as out:
            while True:
                chunk = uploaded_file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_ZIP_BYTES:
                    raise ValueError("ZIP exceeds 500 MB.")
                out.write(chunk)

        with zipfile.ZipFile(archive_path) as archive:
            entries = [
                item for item in archive.infolist()
                if not item.is_dir()
            ]

            if len(entries) > MAX_FILES:
                raise ValueError("Too many files.")

            extracted_bytes = 0
            for entry in entries:
                path = Path(entry.filename)

                if (
                    path.is_absolute()
                    or ".." in path.parts
                    or "\\" in entry.filename
                    or entry.is_dir()
                ):
                    raise ValueError("Unsafe ZIP path.")

                extracted_bytes += entry.file_size
                if extracted_bytes > MAX_ZIP_BYTES * 2:
                    raise ValueError("Uncompressed dataset too large.")

                target = extraction / path
                target.parent.mkdir(parents=True, exist_ok=True)

                with archive.open(entry) as source, open(target, "wb") as out:
                    shutil.copyfileobj(source, out)

        csv_files = list(extraction.rglob("labels.csv"))

        if len(csv_files) != 1:
            raise ValueError(
                "ZIP must contain exactly one labels.csv."
            )

        csv_path = csv_files[0]
        images_dir = csv_path.parent / "images"

        if not images_dir.is_dir():
            raise ValueError(
                "Place images in an images/ folder beside labels.csv."
            )

        counts = Counter()
        rows = []
        seen = set()

        with open(csv_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)

            if not {"id_code", "diagnosis"}.issubset(
                reader.fieldnames or []
            ):
                raise ValueError(
                    "CSV requires id_code and diagnosis columns."
                )

            for row in reader:
                image_id = row["id_code"].strip()
                label_text = row["diagnosis"].strip()

                if (
                    not image_id
                    or "/" in image_id
                    or "\\" in image_id
                    or image_id in seen
                ):
                    raise ValueError("Invalid or duplicate image ID.")

                try:
                    label = int(label_text)
                except ValueError:
                    raise ValueError("Labels must be integers 0–4.")

                if label not in range(5):
                    raise ValueError("Labels must be integers 0–4.")

                
                # Support PNG, JPG and JPEG retinal images
                image_path = None

                for extension in (".png", ".jpg", ".jpeg"):
                    candidate = images_dir / f"{image_id}{extension}"

                    if candidate.is_file():
                        image_path = candidate
                        break

                if image_path is None:
                    raise ValueError(
                        f"Missing image: {image_id} (.png, .jpg, .jpeg)"
                    )

                try:
                    with Image.open(image_path) as image:
                        image.verify()
                except (UnidentifiedImageError, OSError):
                    raise ValueError(
                        f"Invalid image: {image_path.name}"
                    )


                seen.add(image_id)
                counts[label] += 1
                rows.append((image_id, label))

        if len(rows) < 10:
            raise ValueError(
                "At least 10 labeled images are required."
            )

        # Write a normalized CSV understood by DRDataset.
        normalized_csv = csv_path.parent / "client.csv"
        with open(normalized_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["id_code", "diagnosis"])
            writer.writerows(rows)

        manifest = {
            "samples": len(rows),
            "class_distribution": {
                CLASS_NAMES[i]: counts[i] for i in range(5)
            },
            "csv": "client.csv",
            "images": "images",
        }

        with open(
            csv_path.parent / "manifest.json",
            "w",
            encoding="utf-8"
        ) as f:
            json.dump(manifest, f, indent=2)

        active = datasets_root / "active"

        if active.exists():
            raise ValueError(
                "An active dataset already exists. "
                "Dataset replacement is not enabled yet."
            )

        # Move the validated dataset into persistent storage.
        os.replace(csv_path.parent, active)

        return {"status": "success", **manifest}

    finally:
        shutil.rmtree(staging, ignore_errors=True)
