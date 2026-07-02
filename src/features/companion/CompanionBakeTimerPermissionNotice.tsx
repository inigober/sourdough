type CompanionBakeTimerPermissionNoticeProps = {
  title: string;
  body: string;
  showOpenSettings: boolean;
  onOpenSettings: () => void;
};

export function CompanionBakeTimerPermissionNotice({
  title,
  body,
  showOpenSettings,
  onOpenSettings,
}: CompanionBakeTimerPermissionNoticeProps) {
  return (
    <div className="companion__permission-notice" role="status">
      <strong className="companion__permission-notice-title">{title}</strong>
      <p className="companion__permission-notice-body">{body}</p>
      {showOpenSettings ? (
        <button
          type="button"
          className="wizard-button wizard-button--secondary companion__permission-settings"
          onClick={() => void onOpenSettings()}
        >
          Open Settings
        </button>
      ) : null}
    </div>
  );
}
