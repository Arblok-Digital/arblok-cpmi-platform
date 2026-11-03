import { Link } from 'react-router-dom'
import { Compass, Home, ShieldQuestion } from 'lucide-react'
import { useSession } from '@/app/session'
import { roleHome } from '@/lib/store'
import { PageHeader } from '@/components/shared/page'
import { LinkButton } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function NotFoundPage() {
  const { account } = useSession()
  const home = account ? roleHome(account.role) : '/login'

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="404"
        title="Halaman tidak ditemukan"
        description="Tautan mungkin sudah berubah atau Anda tidak memiliki akses ke halaman ini."
      />
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Compass className="h-8 w-8" />
          </span>
          <p className="mt-4 text-sm font-bold text-ink">Alamat ini tidak tersedia</p>
          <p className="mt-1 max-w-md text-xs leading-5 text-muted">
            Periksa kembali tautan, atau kembali ke beranda sesuai peran Anda. Bila Anda yakin ini
            kesalahan sistem, laporkan melalui kanal bantuan.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <LinkButton to={home} icon={<Home className="h-4 w-4" />}>
              Kembali ke beranda
            </LinkButton>
            <LinkButton to="/notifikasi" variant="secondary">
              Buka notifikasi
            </LinkButton>
          </div>
          <p className="mt-6 flex items-center gap-1 text-[10px] text-muted">
            <ShieldQuestion className="h-3 w-3" />
            {account ? 'Akses lintas peran akan dialihkan otomatis.' : 'Silakan masuk untuk melanjutkan.'}
          </p>
          <Link to="/login" className="mt-2 text-[10px] font-bold text-brand hover:underline">
            Halaman masuk
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
