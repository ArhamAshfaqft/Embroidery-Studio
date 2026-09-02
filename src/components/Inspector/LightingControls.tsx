import React from 'react';
import { EmbroiderySettings } from '../../types';
import { SliderControl } from '../Controls/SliderControl';
import { AngleDial } from '../Controls/AngleDial';

interface LightingControlsProps {
  settings: EmbroiderySettings;
  onChange: (updated: Partial<EmbroiderySettings>) => void;
}

export const LightingControls: React.FC<LightingControlsProps> = ({
  settings,
  onChange
}) => {
  return (
    <div className="space-y-1">
      <AngleDial
        label="Light Azimuth Angle"
        value={settings.lightAngle}
        onChange={(lightAngle) => onChange({ lightAngle, presetId: undefined })}
      />

      <SliderControl
        label="Light Elevation"
        value={settings.lightElevation}
        min={15}
        max={85}
        step={1}
        defaultValue={45}
        unit="°"
        onChange={(lightElevation) => onChange({ lightElevation, presetId: undefined })}
      />

      <SliderControl
        label="3D Puff Relief Depth"
        value={settings.embroideryDepth}
        min={1.0}
        max={10.0}
        step={0.5}
        defaultValue={5.5}
        onChange={(embroideryDepth) => onChange({ embroideryDepth, presetId: undefined })}
      />

      <SliderControl
        label="Thread Specular Luster (Rayon)"
        value={settings.specularStrength}
        min={0.0}
        max={10.0}
        step={0.5}
        defaultValue={6.5}
        onChange={(specularStrength) => onChange({ specularStrength, presetId: undefined })}
      />

      <SliderControl
        label="Crevice Ambient Occlusion"
        value={settings.ambientOcclusion}
        min={0.0}
        max={10.0}
        step={0.5}
        defaultValue={6.0}
        onChange={(ambientOcclusion) => onChange({ ambientOcclusion, presetId: undefined })}
      />

      <SliderControl
        label="Needle Puncture Cavities"
        value={settings.needlePunctureDepth !== undefined ? settings.needlePunctureDepth : 6.0}
        min={0.0}
        max={10.0}
        step={0.5}
        defaultValue={6.0}
        onChange={(needlePunctureDepth) => onChange({ needlePunctureDepth, presetId: undefined })}
      />

      <SliderControl
        label="Contact Drop Shadow"
        value={settings.shadowStrength}
        min={0.0}
        max={10.0}
        step={0.5}
        defaultValue={5.0}
        onChange={(shadowStrength) => onChange({ shadowStrength, presetId: undefined })}
      />

      {settings.shadowStrength > 0 && (
        <>
          <SliderControl
            label="Shadow Softness / Blur"
            value={settings.shadowBlur}
            min={1.0}
            max={20.0}
            step={0.5}
            defaultValue={8.0}
            unit="px"
            onChange={(shadowBlur) => onChange({ shadowBlur })}
          />

          <SliderControl
            label="Shadow Offset Distance"
            value={settings.shadowDistance}
            min={1.0}
            max={20.0}
            step={0.5}
            defaultValue={6.0}
            unit="px"
            onChange={(shadowDistance) => onChange({ shadowDistance })}
          />
        </>
      )}
    </div>
  );
};
