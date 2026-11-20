import { useEffect, useState, type ChangeEvent } from 'react';

import { BinIcon, CameraIcon } from '../../components/icons.tsx';
import { compressBakePhoto } from '../../lib/history/compressBakePhoto.ts';

type BakePhotoPickerProps = {
  /** Called with the compressed photo, or null when it was removed. */
  onChange: (photo: Blob | null) => void;
  /** True while a chosen photo is being compressed; the dialog uses it to hold back Save. */
  onBusyChange: (isBusy: boolean) => void;
  disabled?: boolean;
  /** Heading above the picker. The bake detail screen passes its own wording. */
  label?: string;
  /**
   * Just the button, with no box or heading: for a bake that has no photo yet, where the picker
   * would otherwise be a large empty card. Keep the same element mounted when this flips to
   * false, so a chosen file is not lost.
   */
  compact?: boolean;
};

/**
 * Optional loaf photo for the bake-complete dialog. The chosen image is compressed right away,
 * so the preview shows exactly what will be saved. The photo only lives in this component
 * until Save bake; it is not written to the bake session.
 */
export function BakePhotoPicker({
  onChange,
  onBusyChange,
  disabled = false,
  label = 'Photo of your loaf (optional)',
  compact = false,
}: BakePhotoPickerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Reset so choosing the same file again still fires a change event.
    input.value = '';
    if (!file) {
      return;
    }

    setErrorMessage(null);
    setIsCompressing(true);
    // Hold back Save while compressing, so a half-processed photo is never skipped silently.
    onBusyChange(true);
    onChange(null);

    try {
      const photo = await compressBakePhoto(file);
      setPreviewUrl(URL.createObjectURL(photo));
      onChange(photo);
    } catch (error) {
      setPreviewUrl(null);
      setErrorMessage(error instanceof Error ? error.message : 'Could not use that photo.');
    } finally {
      setIsCompressing(false);
      onBusyChange(false);
    }
  }

  function handleRemove(): void {
    setPreviewUrl(null);
    setErrorMessage(null);
    onChange(null);
  }

  return (
    <div className={compact ? 'bake-photo-picker bake-photo-picker--compact' : 'field-card bake-photo-picker'}>
      {compact ? null : <span className="field-label-row">{label}</span>}
      {previewUrl ? (
        <div className="bake-photo-picker__preview">
          <img src={previewUrl} alt="Preview of your loaf photo" className="bake-photo-picker__image" />
          <button
            type="button"
            className="icon-button"
            aria-label="Remove photo"
            onClick={handleRemove}
            disabled={disabled || isCompressing}
          >
            <BinIcon />
          </button>
        </div>
      ) : null}
      <label className="button button--secondary bake-photo-picker__choose">
        <CameraIcon />
        <span>
          {isCompressing ? 'Preparing photo…' : previewUrl ? 'Choose a different photo' : 'Add a photo of your loaf'}
        </span>
        <input
          type="file"
          accept="image/*"
          className="visually-hidden"
          onChange={(event) => void handleFileChange(event)}
          disabled={disabled || isCompressing}
        />
      </label>
      {errorMessage ? (
        <p className="auth-modal__error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
