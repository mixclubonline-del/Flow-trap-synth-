// lib/utils.ts

/**
 * Converts a File object to a base64 encoded string.
 * @param file The File object to convert.
 * @returns A promise that resolves with the base64 string.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // The result from readAsDataURL is a data URL: "data:mime/type;base64,the_base_64_string"
      // We only need the base64 part.
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};
