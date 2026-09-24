import { useMemo, useState } from 'react'
import { useServices } from '@/app/services'
import { toast } from '@/app/shellStore'
import { leagueRepo } from '@/core/league/repo'
import { LeagueView } from '@/core/league/LeagueView'
import { Button, Screen } from '@/core/ui/primitives'
import { EGCA_SEASON } from '../data/egca'
import { loadEgca } from '../data/loadEgca'

export function LeagueScreen() {
  const s = useServices()
  const repo = useMemo(() => leagueRepo(s.db, 'chess'), [s.db])
  const [busy, setBusy] = useState(false)
  const load = async () => {
    setBusy(true)
    try {
      const r = await loadEgca(repo)
      toast(r.added ? `${r.added} fixtures added` : 'Already loaded')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Screen title="League">
      <LeagueView
        module="chess"
        defaultTeam="Cardiff Crows"
        fields={{ board: true, colour: true, ratings: true, pgn: true }}
        actions={
          <Button onClick={() => void load()} disabled={busy}>
            Load EGCA {EGCA_SEASON}
          </Button>
        }
      />
    </Screen>
  )
}
