// components/SportProfile.tsx
//
// Ficha desportiva na página do ténis (ver lib/sportProfile.ts):
// - SportChips: uma linha curta por baixo do título ("Treino diário ·
//   Estrada · Amortecimento alto") para se perceber logo para que serve.
// - SportProfileSection: o bloco "Para que serve" com uso, piso,
//   amortecimento, pisada e os números (drop, peso, altura da sola).
// Só aparece nos ténis que têm ficha desportiva preenchida. Mesmas regras
// visuais do resto do site: cantos retos, linhas de 1px, sem sombras,
// etiquetas de 11px, verde #123F3A.
import {
  CUSHIONING_LABELS,
  CUSHIONING_LEVEL,
  PRONATION_LABELS,
  SURFACE_LABELS,
  USE_LABELS,
  joinLabels,
  type SportProfile,
} from '@/lib/sportProfile'

const LABEL = 'text-[11px] font-medium uppercase tracking-[0.08em] text-[#5C6770]'

export function SportChips({ profile }: { profile: SportProfile }) {
  const chips = [
    ...(profile.uses ?? []).slice(0, 2).map((u) => USE_LABELS[u]),
    ...(profile.surfaces ?? []).slice(0, 2).map((s) => SURFACE_LABELS[s]),
    profile.cushioning ? `Amortecimento ${CUSHIONING_LABELS[profile.cushioning].toLowerCase()}` : null,
  ].filter(Boolean) as string[]
  if (chips.length === 0) return null
  return (
    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Para que serve">
      {chips.map((chip) => (
        <li
          key={chip}
          className="inline-flex items-center border border-[#17232B]/15 px-2.5 py-1 text-[12px] font-medium text-[#17232B]"
        >
          {chip}
        </li>
      ))}
    </ul>
  )
}

function CushioningMeter({ level }: { level: number }) {
  return (
    <span className="mt-2 flex gap-1" aria-hidden="true">
      {[1, 2, 3].map((step) => (
        <span key={step} className={`h-1.5 w-8 ${step <= level ? 'bg-[#123F3A]' : 'bg-[#17232B]/10'}`} />
      ))}
    </span>
  )
}

export function SportProfileSection({ profile, brandName }: { profile: SportProfile; brandName?: string | null }) {
  const uses = joinLabels(profile.uses, USE_LABELS)
  const surfaces = joinLabels(profile.surfaces, SURFACE_LABELS)

  const cells: { label: string; value: string; meter?: number }[] = []
  if (uses) cells.push({ label: 'Uso', value: uses })
  if (surfaces) cells.push({ label: 'Piso', value: surfaces })
  if (profile.cushioning)
    cells.push({
      label: 'Amortecimento',
      value: CUSHIONING_LABELS[profile.cushioning],
      meter: CUSHIONING_LEVEL[profile.cushioning],
    })
  if (profile.pronation) cells.push({ label: 'Pisada', value: PRONATION_LABELS[profile.pronation] })

  const numbers: { label: string; value: string }[] = []
  if (profile.drop_mm != null) numbers.push({ label: 'Drop', value: `${profile.drop_mm} mm` })
  if (profile.weight_g != null) numbers.push({ label: 'Peso', value: `${profile.weight_g} g` })
  if (profile.stack_mm != null) numbers.push({ label: 'Altura da sola', value: `${profile.stack_mm} mm` })

  const notes = [
    brandName ? `Dados oficiais da ${brandName}` : 'Dados oficiais da marca',
    profile.weight_g != null && profile.weight_note ? `peso no ${profile.weight_note}` : null,
    profile.stack_mm != null ? 'altura da sola medida no calcanhar' : null,
  ].filter(Boolean)

  return (
    <section className="mt-10">
      <h2 className="mb-4 font-display text-2xl font-bold tracking-[-0.01em] text-[#17232B]">Para que serve</h2>

      {cells.length > 0 && (
        <div className="grid grid-cols-2 border-l border-t border-[#17232B]/10 md:grid-cols-4">
          {cells.map((cell) => (
            <div key={cell.label} className="border-b border-r border-[#17232B]/10 p-4">
              <p className={LABEL}>{cell.label}</p>
              <p className="mt-1.5 text-[15px] font-semibold leading-snug text-[#17232B]">{cell.value}</p>
              {cell.meter != null && <CushioningMeter level={cell.meter} />}
            </div>
          ))}
        </div>
      )}

      {numbers.length > 0 && (
        <div className="grid grid-cols-3 border-b border-l border-[#17232B]/10">
          {numbers.map((n) => (
            <div key={n.label} className="border-r border-[#17232B]/10 p-4">
              <p className={LABEL}>{n.label}</p>
              <p className="mt-1.5 font-display text-[22px] font-bold tabular-nums leading-none text-[#17232B]">{n.value}</p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-[#5C6770]">
        {notes.join(' · ')}.
        {profile.source_url && (
          <>
            {' '}
            <a href={profile.source_url} target="_blank" rel="nofollow noopener" className="underline underline-offset-2">
              Ver fonte
            </a>
          </>
        )}
      </p>
    </section>
  )
}
