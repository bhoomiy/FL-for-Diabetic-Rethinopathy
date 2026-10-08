// Role based sidebar navigation. Every entry points to a real route.
export const ADMIN_NAV = [
  {
    section: "Overview",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: "LayoutDashboard" },
      { label: "Async FL Monitoring", to: "/async-monitoring", icon: "Activity" },
      { label: "Federated Setup", to: "/federated-setup", icon: "Network" },
      { label: "Clients", to: "/clients", icon: "Building2" },
      { label: "Data Distribution", to: "/data-distribution", icon: "PieChart" },
    ],
  },
  {
    section: "Experiments",
    items: [
      { label: "Experiments", to: "/experiments", icon: "FlaskConical" },
      { label: "Configure Experiment", to: "/configure-experiment", icon: "SlidersHorizontal" },
      { label: "FedAvg vs FedProx", to: "/fedavg-vs-fedprox", icon: "GitCompare" },
      { label: "IID vs Non-IID", to: "/iid-vs-non-iid", icon: "Shuffle" },
      { label: "DP vs Non-DP", to: "/dp-vs-non-dp", icon: "ShieldCheck" },
    ],
  },
  {
    section: "Evaluation",
    items: [
      { label: "Model Performance", to: "/model-performance", icon: "Activity" },
      { label: "Class Metrics", to: "/class-metrics", icon: "ListChecks" },
      { label: "Confusion Matrix", to: "/confusion-matrix", icon: "Grid3x3" },
      { label: "Class Imbalance", to: "/class-imbalance", icon: "Scale" },
      { label: "Model Improvement", to: "/model-improvement", icon: "TrendingUp" },
    ],
  },
  {
    section: "Tools",
    items: [
      { label: "Prediction", to: "/prediction", icon: "ScanEye" },
      { label: "Experiment History", to: "/experiment-history", icon: "History" },
    ],
  },
];

export const HOSPITAL_NAV = [
  {
    section: "My Hospital",
    items: [
      { label: "Hospital Dashboard", to: "/hospital", icon: "LayoutDashboard" },
      { label: "Local Dataset", to: "/hospital/dataset", icon: "Database" },
      { label: "Local Training", to: "/hospital/training", icon: "Cpu" },
      { label: "Global Model", to: "/hospital/global-model", icon: "Globe" },
      { label: "Prediction", to: "/prediction", icon: "ScanEye" },
    ],
  },
];
