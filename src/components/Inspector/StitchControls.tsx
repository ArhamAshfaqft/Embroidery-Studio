import React from 'react';
import { EmbroiderySettings } from '../../types';
import { SliderControl } from '../Controls/SliderControl';
import { AngleDial } from '../Controls/AngleDial';

interface StitchControlsProps {
  settings: EmbroiderySettings;
  onChange: (updated: Partial<EmbroiderySettings>) => void;
}

export const StitchControls: React.FC<StitchControlsProps> = ({
  settings,
  onChange
}) => {
  return (
    <div className="space-y-1">
      <AngleDial
        label="Stitch Direction"
        value={settings.stitchAngle}
        onChange={(stitchAngle) => onChange({ stitchAngle, presetId: undefined })}
      />

      <SliderControl
        label="Thread Density"
        value={settings.stitchDensity}
        min={2.5}
        max={10.0}
        step={0.5}
        defaultValue={6.0}
        onChange={(stitchDensity) => onChange({ stitchDensity, presetId: undefined })}
      />

      <SliderControl
        label="Thread Thickness"
        value={settings.threadThickness}
        min={2.0}
        max={8.5}
        step={0.5}
        defaultValue={5.0}
        onChange={(threadThickness) => onChange({ threadThickness, presetId: undefined })}
      />

      <SliderControl
        label="Stitch Length"
        value={settings.stitchLength}
        min={2.0}
        max={20.0}
        step={0.5}
        defaultValue={8.0}
        unit="mm"
        onChange={(stitchLength) => onChange({ stitchLength, presetId: undefined })}
      />

      <SliderControl
        label="Organic Jitter"
        value={settings.stitchJitter}
        min={0.0}
        max={10.0}
        step={0.5}
        defaultValue={2.0}
        onChange={(stitchJitter) => onChange({ stitchJitter, presetId: undefined })}
      />

      <SliderControl
        label="Thread Strand Twist"
        value={settings.threadTwist}
        min={1.0}
        max={10.0}
        step={0.5}
        defaultValue={6.0}
        onChange={(threadTwist) => onChange({ threadTwist, presetId: undefined })}
      />
    </div>
  );
};
