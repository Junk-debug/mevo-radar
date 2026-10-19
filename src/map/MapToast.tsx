import { useI18n } from "../i18n";

export function MapToast({ text, onCancel }: { text: string; onCancel: () => void }) {
  const { t } = useI18n();
  return (
    <div className="map-toast" role="status">
      <span>{text}</span>
      <button type="button" onClick={onCancel}>{t("cancel")}</button>
    </div>
  );
}
