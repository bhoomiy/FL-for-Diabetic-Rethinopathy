# FedRetina AI

A privacy-preserving federated learning system for five-class diabetic retinopathy classification, with an interactive clinical research dashboard for visualizing clients, experiments, model performance, and predictions.

> **Research disclaimer:** This project is intended for academic research and demonstration purposes only. It is not a medical device and must not be used for clinical diagnosis or treatment decisions.

## Overview

FedRetina AI investigates diabetic retinopathy classification using federated learning. Instead of transferring retinal images to a central location, participating hospitals train models locally and share only model updates with a global server.

The project evaluates federated learning under both IID and Non-IID data distributions and compares FedAvg with FedProx. It also applies weighted aggregation and class weighting to address unequal client dataset sizes and class imbalance.

The system contains:

* Four simulated hospital clients
* Five diabetic retinopathy classes
* IID and Non-IID data distributions
* FedAvg and FedProx algorithms
* Standard and weighted aggregation
* Class weighting for imbalanced data
* Experiment configuration and comparison tools
* Class-wise metrics and confusion matrices
* Hospital login and role-based dashboards
* Retinal image prediction interface
* Grad-CAM-ready prediction visualization

## Current Best Result

| Setting              | Value                |
| -------------------- | -------------------- |
| Data distribution    | Non-IID              |
| Federated algorithm  | FedProx              |
| Aggregation          | Weighted aggregation |
| Learning rate        | `0.0005`             |
| FedProx μ            | `0.01`               |
| Local epochs         | `5`                  |
| Communication rounds | `20`                 |
| Batch size           | `32`                 |
| Validation accuracy  | **80.33%**           |

Although the model achieves an overall validation accuracy of **80.33%**, one of the five classes still has weaker detection performance. Therefore, the next stage of the research focuses on improving minority-class recall and F1-score rather than optimizing accuracy alone.

## Diabetic Retinopathy Classes

The model performs five-class classification:

1. No DR
2. Mild
3. Moderate
4. Severe
5. Proliferative DR

Because the dataset is imbalanced, the dashboard emphasizes per-class precision, recall, F1-score, and confusion-matrix results in addition to overall accuracy.

## Federated Learning Architecture

The system consists of one global server and four participating hospital clients.

Each hospital:

1. Keeps its retinal dataset locally.
2. Receives the current global model.
3. Trains the model using local data.
4. Sends model parameters or updates to the server.
5. Receives the newly aggregated global model.

The global server aggregates client updates using FedAvg or FedProx. Weighted aggregation allows clients with more training samples to contribute proportionally to the global model.

```text
                         Global Server
                    FedAvg / FedProx
                              |
          +-------------------+-------------------+
          |                   |                   |
      Hospital A          Hospital B          Hospital C
       Client 1            Client 2            Client 3
                                                  |
                                              Hospital D
                                               Client 4
```

No raw retinal images need to be exchanged between hospitals during federated training.

## Dashboard Features

### Research Dashboard

The main dashboard provides an overview of:

* Number of participating clients
* Active data distribution
* Selected federated algorithm
* Validation accuracy
* F1-score
* Communication rounds
* Global model status
* Training and validation accuracy curves
* Current best experiment configuration

### Federated Setup

The federated setup page visualizes the four-client architecture and displays information for each hospital, including:

* Number of samples
* Local epochs
* Local model status
* Local accuracy
* Validation accuracy
* Class distribution
* Training status

### IID vs Non-IID Distribution

The application allows the user to compare IID and Non-IID client distributions.

In the IID setting, each client receives a relatively similar class distribution. In the Non-IID setting, clients contain different proportions of diabetic retinopathy classes, representing realistic differences between hospitals.

### Experiment Configuration

Researchers can configure:

* FedAvg or FedProx
* Standard or weighted aggregation
* IID or Non-IID distribution
* Learning rate
* FedProx μ
* Local epochs
* Communication rounds
* Batch size
* Class weighting

### Algorithm Comparison

The comparison dashboard presents:

* FedAvg versus FedProx
* IID versus Non-IID
* Accuracy across communication rounds
* F1-score
* Best-performing configuration
* Weakest-performing class
* Experiment history

### Class Performance

The model performance section includes:

* Overall validation accuracy
* Macro and weighted F1-score
* Per-class precision
* Per-class recall
* Per-class F1-score
* Class-wise performance bars
* Confusion matrix
* Automatic highlighting of the weakest class

### Class Imbalance Analysis

The class imbalance page compares:

* Original class distribution
* Applied class weights
* Performance without class weighting
* Performance with class weighting
* Changes in minority-class recall

### Prediction

The prediction page allows a user to:

* Upload a retinal fundus image
* Preview the selected image
* Analyze the image
* View the predicted DR stage
* View prediction confidence
* Compare probabilities across all five classes
* Display a Grad-CAM visualization when connected to the model backend

### Hospital Login

The frontend includes role-based access for hospitals and administrators.

Hospital users can access:

* Their local dataset summary
* Local training status
* Client-specific performance
* Global model information
* Retinal image prediction

Administrator or researcher users can access:

* All clients
* Experiment configuration
* Global model results
* Algorithm comparisons
* Class metrics
* Confusion matrices
* Experiment history

## Technology Stack

### Frontend

* React
* TypeScript and JavaScript
* Vite
* TanStack Router
* shadcn/ui
* Recharts
* Lucide icons
* CSS

### Machine Learning

* Python
* Federated learning
* FedAvg
* FedProx
* Weighted model aggregation
* Class-weighted training
* Multi-class image classification

## Project Structure

```text
FL-for-Diabetic-Retinopathy/
├── datasets/               # Dataset preparation and metadata
├── federated/              # Federated learning implementation
├── fl/                     # FL utilities and algorithms
├── frontend/               # FedRetina AI web dashboard
│   ├── public/             # Static frontend assets
│   ├── src/
│   │   ├── components/     # Shared UI, charts and FL components
│   │   ├── constants/      # DR classes and navigation
│   │   ├── context/        # Authentication context
│   │   ├── data/           # Demo client and experiment data
│   │   ├── pages/          # Dashboard and authentication pages
│   │   ├── routes/         # Application routes
│   │   ├── services/       # API service layer
│   │   └── styles.css      # Global styles and theme
│   ├── package.json
│   └── vite.config.ts
├── models/                 # Saved model files
├── results/                # Metrics and experiment outputs
├── training/               # Central and local training scripts
└── README.md
```

## Running the Frontend

### Prerequisites

Install:

* Node.js 18 or newer
* npm
* Git

### Installation

Clone the repository:

```bash
git clone https://github.com/bhoomiy/FL-for-Diabetic-Retinopathy.git
cd FL-for-Diabetic-Retinopathy
```

Open the frontend directory:

```bash
cd frontend
```

Install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in the terminal, usually:

```text
http://localhost:5173
```

## Running the Machine Learning Code

Create a Python virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```bash
.venv\Scripts\activate
```

Activate it on macOS or Linux:

```bash
source .venv/bin/activate
```

If the repository contains a `requirements.txt` file, install the Python dependencies with:

```bash
pip install -r requirements.txt
```

The exact training command depends on the experiment script being used. Dataset paths and training settings should be configured before starting federated training.

## Connecting the Frontend to the Backend

Frontend API logic is organized inside:

```text
frontend/src/services/
```

The service layer includes modules for:

* Authentication
* Federated client information
* Experiment management
* Model evaluation
* Retinal image prediction

Replace the current demonstration data with backend API calls once the federated learning and prediction endpoints are available.

Suggested endpoints include:

```text
POST /api/auth/login
GET  /api/clients
GET  /api/experiments
POST /api/experiments
GET  /api/metrics
POST /api/predict
```

## Research Objectives

The project investigates the following questions:

1. How does Non-IID data affect diabetic retinopathy classification in federated learning?
2. Does FedProx perform better than FedAvg under heterogeneous hospital data?
3. Can weighted aggregation improve the contribution of clients with different dataset sizes?
4. Can class weighting improve recall for underrepresented DR classes?
5. How can minority-class sensitivity be improved without sharing private hospital data?

## Future Improvements

Planned improvements include:

* Focal loss
* Weighted loss functions
* Oversampling of minority classes
* Stronger retinal image augmentation
* Client-specific augmentation policies
* Additional FedProx μ experiments
* Learning-rate scheduling
* More communication rounds
* Early stopping
* Additional hospital clients
* Real backend authentication
* Live training progress
* Automated experiment logging
* Grad-CAM integration
* Model checkpoint comparison
* Secure aggregation
* Differential privacy

## Contributors

* [samhita-code](https://github.com/samhita-code)
* [bhoomiy](https://github.com/bhoomiy)
* [dishaay](https://github.com/dishaay) 

> **Improving minority-class sensitivity under Non-IID federated learning.**
