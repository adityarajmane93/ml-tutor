import axios from "axios";

export async function executePipeline(
  pipeline: any
) {

  const response =
    await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/execute-pipeline`,
      pipeline
    );

  return response.data;
}