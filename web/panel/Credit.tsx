import { useI18n } from "@/i18n";
import { Icon } from "@/ui";

const AUTHOR = {
  name: "Maksim Navumovich",
  profile: "https://github.com/Junk-debug",
  avatar: "https://avatars.githubusercontent.com/u/77940841?v=4&s=96",
};
const REPO = "https://github.com/Junk-debug/mevo-radar";

export function Credit() {
  const { t } = useI18n();
  return (
    <footer className="sheet-foot">
      <div className="credit">
        <a className="credit-author" href={AUTHOR.profile} target="_blank" rel="noopener">
          <img className="credit-avatar" src={AUTHOR.avatar} alt="" width={36} height={36} loading="lazy" />
          <span className="credit-text">
            <span className="credit-label">{t("madeBy")}</span>
            <span className="credit-name">{AUTHOR.name}</span>
          </span>
        </a>
        <a className="credit-repo" href={REPO} target="_blank" rel="noopener" title={t("sourceCode")} aria-label={t("sourceCode")}>
          <Icon name="github" />
          <span>{t("sourceCode")}</span>
        </a>
      </div>
      <p className="disclaimer">{t("unofficial")}</p>
    </footer>
  );
}
