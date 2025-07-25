import { useEffect, useState } from 'react';
import type ScribePlugin from 'src';
import { SettingsItem } from './SettingsItem';

interface AudioDevice {
  deviceId: string;
  label: string;
}

export function AudioDeviceSettings({
  plugin,
  saveSettings,
}: {
  plugin: ScribePlugin;
  saveSettings: () => void;
}) {
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState(plugin.settings.selectedAudioDeviceId);

  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        // Request permission to access media devices
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Get list of audio input devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputDevices = devices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone (${device.deviceId.slice(0, 8)}...)`
          }));
        
        setAudioDevices(audioInputDevices);
      } catch (error) {
        console.error('Error getting audio devices:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getAudioDevices();
  }, []);

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    plugin.settings.selectedAudioDeviceId = deviceId;
    saveSettings();
  };

  return (
    <SettingsItem
      name="Audio Input Device"
      description="Select which microphone to use for recording"
      control={
        isLoading ? (
          <div>Loading devices...</div>
        ) : (
          <select
            value={selectedDeviceId}
            className="dropdown"
            onChange={(e) => handleDeviceChange(e.target.value)}
          >
            <option value="">System Default</option>
            {audioDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        )
      }
    />
  );
}
