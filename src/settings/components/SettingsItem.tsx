export const SettingsItem: React.FC<{
  name: string;
  description: string;
  control: React.ReactNode;
}> = ({ name, description, control }) => {
  return (
    <div className="setting-item">
      <div className="setting-item-info">
        <div className="setting-item-name">{name}</div>
        <div className="setting-item-description">{description}</div>
      </div>
      <div className="setting-item-control">{control}</div>
    </div>
  );
};
