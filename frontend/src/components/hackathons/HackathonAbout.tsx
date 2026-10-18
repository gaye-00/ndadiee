import { useTranslation } from 'react-i18next';
import HackathonMedal from './HackathonMedal';
import InlineMarkdown from '@/components/projects/InlineMarkdown';
import { markdownBlocks } from '@/components/projects/markdownBlocks';
import Chip from '@/components/shared/Chip';
import type { Hackathon } from '@/types/hackathon.types';
import { formatRelativeTime, isolate } from '@/utils/formatters';

/** La place d'un prix, quand son intitulé commence par elle (« 1er prix », « 2nd prize ») ; sinon une distinction. */
function rankOf(title: string): number | null {
  const place = /^\s*(\d+)/.exec(title);
  return place ? Number(place[1]) : null;
}

/**
 * La marge d'un hackathon : ses prix, avec leurs médailles, puis ce qu'il faut savoir (la description de
 * l'organisation, ses thèmes) et qui l'organise. Reste en vue pendant qu'on parcourt les équipes.
 */
export default function HackathonAbout({ hackathon }: { hackathon: Hackathon }) {
  const { t } = useTranslation('hackathons');
  const blocks = markdownBlocks(hackathon.description);

  return (
    <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
      {(hackathon.prizes.length > 0 || hackathon.prizePool) && (
        <section aria-labelledby="hackathon-prizes-title" className="glass rounded-2xl p-5">
          <h2 id="hackathon-prizes-title" className="eyebrow">
            {t('about.prizes')}
          </h2>
          {hackathon.prizePool && (
            <p className="mt-2 font-display text-h4 text-kente-warm">
              <bdi>{hackathon.prizePool}</bdi>
            </p>
          )}
          {hackathon.prizes.length > 0 && (
            <ol className="mt-3 divide-y divide-border-subtle">
              {hackathon.prizes.map((prize) => (
                <li key={prize.title} className="flex items-start gap-3 py-3 first:pt-1 last:pb-0">
                  <HackathonMedal rank={rankOf(prize.title)} className="mt-0.5" />
                  <div className="min-w-0">
                    <p dir="auto" className="text-start text-sm font-semibold text-foreground">
                      {prize.title}
                    </p>
                    <p dir="auto" className="text-start text-[0.8125rem] leading-relaxed text-muted-foreground">
                      {prize.reward}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <section aria-labelledby="hackathon-about-title" className="glass rounded-2xl p-5">
        <h2 id="hackathon-about-title" className="eyebrow">
          {t('about.title')}
        </h2>
        {/* Écrite par l'organisation, dans sa langue : le navigateur en déduit le sens d'écriture */}
        <div dir="auto" className="mt-3 flex flex-col gap-3 text-start text-sm leading-relaxed text-soft-foreground">
          {blocks.map((block, index) =>
            block.kind === 'list' ? (
              <ul key={index} className="flex flex-col gap-1.5">
                {block.items.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" />
                    <span>
                      <InlineMarkdown text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p key={index}>
                <InlineMarkdown text={block.text} />
              </p>
            ),
          )}
        </div>

        {hackathon.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {hackathon.tags.map((tag) => (
              <Chip key={tag.id}>{tag.name}</Chip>
            ))}
          </div>
        )}

        <p className="mt-5 border-t border-border-subtle pt-4 text-xs text-muted-foreground">
          {t('about.organizedBy', { name: isolate(hackathon.organizerName), time: formatRelativeTime(hackathon.createdAt) })}
        </p>
      </section>
    </aside>
  );
}
