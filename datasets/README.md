# Dataset

The image dataset is **not included** in this repository due to GitHub's file size limitations.

## Download

Download the dataset images from the Google Drive link below:

**Google Drive:**
`https://drive.google.com/drive/folders/1UDD1ypyEeCoQypKGOgY6KspOT9V5vS5Z?usp=drive_link`

## Extract the Files

After downloading, place the image folders inside the `datasets` directory so that the structure is:

```text
datasets/
├── train.csv
├── valid.csv
├── test.csv
├── preprocess.ipynb
├── train_images/
├── test_images/
└── val_images/
```

**Important:**

* Do **not** rename any of the folders.
* Ensure the folder names are exactly:

  * `train_images`
  * `test_images`
  * `val_images`

The training and evaluation scripts expect this directory structure.
