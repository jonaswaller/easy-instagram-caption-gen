import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface CaptionResponse {
  captions: {
    shortCaption: string;
    mediumCaption: string;
    longCaption: string;
  };
  success: boolean;
}

export const generateCaptions = async (
  file: File,
  handle: string
): Promise<CaptionResponse> => {

  const formData = new FormData();
  formData.append('photo', file);
  formData.append('handle', handle);

  const response = await axios.post<CaptionResponse>(
    `${API_URL}/generate-caption`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};