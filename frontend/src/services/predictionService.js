export const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
export const MAX_FILE_SIZE_MB = 8;

export function validateImageFile(file) {
  if (!file) {
    return "Please choose a retinal fundus image.";
  }

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Unsupported format. Upload a JPG, JPEG or PNG image.";
  }

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`;
  }

  return null;
}

export async function predictImage(file) {
  const formData = new FormData();

  formData.append("image", file);

  const response = await fetch(
    "http://localhost:5000/api/predict",
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Prediction failed."
    );
  }

  return data;
}