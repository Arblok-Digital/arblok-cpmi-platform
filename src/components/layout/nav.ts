import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  FileCheck2,
  GitBranch,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  MessageSquareWarning,
  Network,
  Plus,
  ReceiptText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Role } from '@/lib/types'

export type NavBadge = 'referrals' | 'documents' | 'visits' | 'complaints'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badge?: NavBadge
  cta?: boolean
}

export type NavSection = {
  label?: string
  items: NavItem[]
}

export function navForRole(role: Role): NavSection[] {
  if (role === 'p3mi_admin' || role === 'p3mi_reviewer') {
    return [
      {
        label: 'Operasional',
        items: [
          { to: '/p3mi', label: 'Ringkasan', icon: LayoutDashboard, end: true },
          { to: '/p3mi/referral', label: 'Referral Masuk', icon: Inbox, badge: 'referrals' },
          { to: '/p3mi/kandidat', label: 'Kandidat', icon: Users },
          { to: '/p3mi/pipeline', label: 'Pipeline Penempatan', icon: GitBranch },
          { to: '/p3mi/dokumen', label: 'Verifikasi Dokumen', icon: FileCheck2, badge: 'documents' },
          { to: '/p3mi/kunjungan', label: 'Jadwal & Serah Terima', icon: CalendarDays, badge: 'visits' },
        ],
      },
      {
        label: 'Komisi & layanan',
        items: [
          { to: '/p3mi/fee', label: 'Perjanjian Fee', icon: ReceiptText },
          { to: '/p3mi/pengaduan', label: 'Pengaduan', icon: MessageSquareWarning, badge: 'complaints' },
        ],
      },
      {
        label: 'Organisasi',
        items: [
          { to: '/p3mi/agen', label: 'Agen & Kemitraan', icon: Network },
          { to: '/p3mi/laporan', label: 'Laporan', icon: BarChart3 },
          { to: '/p3mi/pengaturan', label: 'Pengaturan', icon: Settings },
        ],
      },
    ]
  }

  if (role === 'agent' || role === 'agent_coordinator') {
    return [
      {
        label: 'Ruang kerja',
        items: [
          { to: '/agen', label: 'Beranda', icon: LayoutDashboard, end: true },
          { to: '/agen/referral/baru', label: 'Buat Referral', icon: Plus, cta: true },
          { to: '/agen/kandidat', label: 'Kandidat Saya', icon: Users },
          { to: '/agen/komisi', label: 'Komisi Saya', icon: Wallet },
          ...(role === 'agent_coordinator'
            ? [{ to: '/agen/jaringan', label: 'Jaringan Saya', icon: Network }]
            : []),
        ],
      },
      {
        label: 'Akun',
        items: [
          { to: '/agen/bantuan', label: 'Bantuan & Pengaduan', icon: LifeBuoy },
          { to: '/agen/akun', label: 'Akun Saya', icon: Settings },
        ],
      },
    ]
  }

  if (role === 'cpmi') {
    return [
      {
        items: [
          { to: '/cpmi', label: 'Beranda', icon: LayoutDashboard, end: true },
          { to: '/cpmi/data', label: 'Data Saya', icon: Users },
          { to: '/cpmi/dokumen', label: 'Dokumen Saya', icon: FileCheck2 },
          { to: '/cpmi/perkembangan', label: 'Perkembangan', icon: GitBranch },
          { to: '/cpmi/bantuan', label: 'Bantuan / Pengaduan', icon: LifeBuoy },
        ],
      },
    ]
  }

  return [
    {
      label: 'Platform',
      items: [
        { to: '/platform', label: 'Ringkasan Platform', icon: LayoutDashboard, end: true },
        { to: '/platform/organisasi', label: 'Organisasi P3MI', icon: Building2 },
        { to: '/platform/jaringan', label: 'Jaringan Agen', icon: Network },
        { to: '/platform/audit', label: 'Audit & Keamanan', icon: ShieldCheck },
        { to: '/platform/konfigurasi', label: 'Konfigurasi', icon: SlidersHorizontal },
      ],
    },
  ]
}

export function mobileNavForRole(role: Role): { items: NavItem[]; moreLabel: string } {
  if (role === 'agent' || role === 'agent_coordinator') {
    return {
      items: [
        { to: '/agen', label: 'Beranda', icon: LayoutDashboard, end: true },
        { to: '/agen/kandidat', label: 'Kandidat', icon: Users },
        { to: '/agen/referral/baru', label: 'Referral', icon: Plus, cta: true },
        { to: '/agen/komisi', label: 'Komisi', icon: Wallet },
      ],
      moreLabel: 'Lainnya',
    }
  }
  if (role === 'cpmi') {
    return {
      items: [
        { to: '/cpmi', label: 'Beranda', icon: LayoutDashboard, end: true },
        { to: '/cpmi/dokumen', label: 'Dokumen', icon: FileCheck2 },
        { to: '/cpmi/perkembangan', label: 'Progres', icon: GitBranch },
        { to: '/cpmi/bantuan', label: 'Bantuan', icon: LifeBuoy },
      ],
      moreLabel: 'Lainnya',
    }
  }
  if (role === 'arblok_admin') {
    return {
      items: [
        { to: '/platform', label: 'Platform', icon: LayoutDashboard, end: true },
        { to: '/platform/organisasi', label: 'Organisasi', icon: Building2 },
        { to: '/platform/audit', label: 'Audit', icon: ShieldCheck },
      ],
      moreLabel: 'Lainnya',
    }
  }
  return {
    items: [
      { to: '/p3mi', label: 'Ringkasan', icon: LayoutDashboard, end: true },
      { to: '/p3mi/referral', label: 'Referral', icon: Inbox, badge: 'referrals' },
      { to: '/p3mi/kandidat', label: 'Kandidat', icon: Users },
      { to: '/p3mi/dokumen', label: 'Dokumen', icon: FileCheck2, badge: 'documents' },
    ],
    moreLabel: 'Lainnya',
  }
}

export function pageTitle(pathname: string, role: Role): string {
  if (pathname.includes('/kandidat/')) return 'Detail kandidat'
  if (pathname.includes('/referral/baru')) return 'Buat referral'
  if (pathname.includes('/referral/')) return 'Detail referral'
  if (pathname.includes('/notifikasi')) return 'Notifikasi'
  if (pathname.includes('/jaringan')) return role === 'arblok_admin' ? 'Jaringan agen' : 'Jaringan saya'
  const items = navForRole(role).flatMap((s) => s.items)
  const exact = items.find((i) => i.to === pathname)
  if (exact) return exact.label
  const sorted = [...items].sort((a, b) => b.to.length - a.to.length)
  return sorted.find((i) => pathname.startsWith(i.to) && i.to !== '/')?.label ?? 'ARBLOK CPMI'
}

export { Bell }
