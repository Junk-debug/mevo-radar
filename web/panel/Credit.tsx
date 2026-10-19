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
    <footer className="grid gap-2 pt-2.5 px-[18px] pb-3 border-t border-line max-desktop:gap-1 max-desktop:py-2 max-desktop:px-4 max-desktop:group-[.collapsed]:hidden">
      <div className="flex items-center justify-between gap-3">
        <a className="group/author flex items-center gap-2.5 min-w-0 rounded-sm text-inherit no-underline" href={AUTHOR.profile} target="_blank" rel="noopener">
          <img
            className="size-9 flex-none rounded-full border border-line bg-surface-2 object-cover max-desktop:size-7"
            src={AUTHOR.avatar}
            alt=""
            width={36}
            height={36}
            loading="lazy"
          />
          <span className="grid leading-[1.2] min-w-0">
            <span className="text-[11.5px] text-muted max-desktop:hidden">{t("madeBy")}</span>
            <span className="font-semibold text-[14px] truncate group-hover/author:text-accent max-desktop:text-[13px]">{AUTHOR.name}</span>
          </span>
        </a>
        <a
          className="inline-flex items-center gap-1.5 flex-none px-2.5 py-1.5 border border-line rounded-full text-[12.5px] font-semibold text-inherit no-underline hover:border-ink max-desktop:p-1.5"
          href={REPO}
          target="_blank"
          rel="noopener"
          title={t("sourceCode")}
          aria-label={t("sourceCode")}
        >
          <Icon name="github" />
          <span className="max-desktop:hidden">{t("sourceCode")}</span>
        </a>
      </div>
      <p className="m-0 text-[11px] text-muted max-desktop:text-[10.5px]">{t("unofficial")}</p>
    </footer>
  );
}
