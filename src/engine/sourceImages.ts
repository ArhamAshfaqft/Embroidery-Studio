// Share decoded source images between the editor, mockup view and export dialog.
// Keep only the most recent two URLs so switching views does not decode again.
const decoded = new Map<string, Promise<HTMLImageElement>>();
let uploadedUrl: string | null = null;

export function loadSourceImage(url: string): Promise<HTMLImageElement> {
  const cached = decoded.get(url);
  if (cached) return cached;
  const task = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous'; image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => { decoded.delete(url); reject(new Error('Could not decode artwork')); };
    image.src = url;
  });
  if (decoded.size >= 2) decoded.delete(decoded.keys().next().value!);
  decoded.set(url, task);
  return task;
}

export function retainUploadedImage(url: string) {
  if (uploadedUrl && uploadedUrl !== url) {
    decoded.delete(uploadedUrl);
    URL.revokeObjectURL(uploadedUrl);
  }
  uploadedUrl = url;
}
